"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/brief";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("next", next);
    const r = await fetch("/api/auth/login", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error ?? "Login failed");
      setBusy(false);
      return;
    }
    router.replace(j.next ?? "/brief");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs text-fg-2">Email</span>
        <input name="email" type="email" required autoComplete="username" defaultValue="analyst@example.com"
          className="w-full rounded-md border border-line-2 bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-fg-2">Password</span>
        <input name="password" type="password" required autoComplete="current-password" defaultValue="macro-brief-demo"
          className="w-full rounded-md border border-line-2 bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-fg-2">Authenticator code <span className="text-fg-3">(if 2FA enabled)</span></span>
        <input name="code" inputMode="numeric" pattern="[0-9 ]*" placeholder="123 456" autoComplete="one-time-code"
          className="num w-full rounded-md border border-line-2 bg-bg px-3 py-2 text-sm tracking-widest outline-none focus:border-accent" />
      </label>
      {error && <p className="rounded border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">{error}</p>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg hover:bg-accent-2 disabled:opacity-60">
        <Lock className="h-4 w-4" /> {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[11px] text-fg-3">
        Demo credentials are pre-filled. Production uses hashed passwords, TOTP 2FA, rate-limited logins and TLS via Caddy.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,rgba(245,185,66,0.08),transparent_60%)] p-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-lg font-black text-bg">M</div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">MacroBrief</h1>
            <p className="flex items-center gap-1 text-[11px] text-fg-3"><ShieldCheck className="h-3 w-3 text-up" /> Private · invite-only</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
