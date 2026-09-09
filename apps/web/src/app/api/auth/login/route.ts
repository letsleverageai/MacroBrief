import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  checkRateLimit,
  clearFailures,
  createSessionToken,
  recordFailure,
  totpEnabled,
  verifyCredentials,
  verifyTotp,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const code = String(form.get("code") ?? "");
  const next = String(form.get("next") ?? "/brief");

  const ok = (await verifyCredentials(email, password)) && (!totpEnabled() || (await verifyTotp(code)));
  if (!ok) {
    recordFailure(ip);
    // Uniform error + small delay to blunt enumeration/timing.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  clearFailures(ip);

  const token = await createSessionToken(email.toLowerCase());
  const res = NextResponse.json({ ok: true, next: next.startsWith("/") ? next : "/brief" });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}
