/**
 * Minimal, dependency-free session auth that runs in both Node and Edge runtimes.
 *
 * - Credentials: AUTH_EMAIL + AUTH_PASSWORD (mock) or AUTH_PASSWORD_SHA256 (hex) in production.
 * - Optional TOTP 2FA: AUTH_TOTP_SECRET (base32). Compatible with Google Authenticator / 1Password.
 * - Session: HMAC-SHA256 signed cookie, 12h sliding expiry, HttpOnly, Secure, SameSite=Strict.
 *
 * In production this sits behind Caddy (TLS + rate limiting) and optionally Cloudflare Access
 * or Tailscale — see deploy/ and docs/PLAN.md §Security.
 */

export const SESSION_COOKIE = "mb_session";
const SESSION_TTL_SEC = 12 * 60 * 60;

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string, hash: "SHA-256" | "SHA-1" = "SHA-256") {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash }, false, ["sign", "verify"]);
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (>=32 chars) in production");
    return "dev-only-insecure-secret-change-me";
  }
  return s;
}

export interface Session {
  sub: string;
  iat: number;
  exp: number;
}

export async function createSessionToken(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Session = { sub: email, iat: now, exp: now + SESSION_TTL_SEC };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret());
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const key = await hmacKey(secret());
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = (process.env.AUTH_EMAIL ?? "analyst@example.com").toLowerCase();
  if (!timingSafeEqual(email.trim().toLowerCase(), expectedEmail)) return false;
  const hash = process.env.AUTH_PASSWORD_SHA256;
  if (hash) return timingSafeEqual(await sha256Hex(password), hash.toLowerCase());
  const plain = process.env.AUTH_PASSWORD ?? "macro-brief-demo";
  return timingSafeEqual(password, plain);
}

// ------------------------------- TOTP ---------------------------------

function base32Decode(s: string): Uint8Array<ArrayBuffer> {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const out = new Uint8Array(new ArrayBuffer(bytes.length));
  out.set(bytes);
  return out;
}

export function totpEnabled(): boolean {
  return !!process.env.AUTH_TOTP_SECRET;
}

export async function verifyTotp(code: string, window = 1): Promise<boolean> {
  const secretB32 = process.env.AUTH_TOTP_SECRET;
  if (!secretB32) return true; // 2FA not configured
  const keyBytes = base32Decode(secretB32);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const counter = step + w;
    const msg = new Uint8Array(new ArrayBuffer(8));
    let c = counter;
    for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
    const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
    const off = h[19] & 0xf;
    const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
    const otp = (bin % 1_000_000).toString().padStart(6, "0");
    if (timingSafeEqual(otp, code.replace(/\s+/g, ""))) return true;
  }
  return false;
}

// ------------------------- login rate limiting -------------------------
// Per-process memory; production also rate-limits at Caddy. Good enough for a single-node deploy.
const attempts = new Map<string, { n: number; until: number }>();
export function checkRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.until > now && a.n >= 5) return { ok: false, retryAfterSec: Math.ceil((a.until - now) / 1000) };
  return { ok: true };
}
export function recordFailure(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.until < now) attempts.set(ip, { n: 1, until: now + 15 * 60_000 });
  else a.n += 1;
}
export function clearFailures(ip: string) {
  attempts.delete(ip);
}
