"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, AlertTriangle } from "lucide-react";
import clsx from "clsx";

/**
 * Runs the full daily_brief.email job on the pipeline (all scans → LLM → render → send).
 * Where no email provider is configured the pipeline writes the HTML to pipeline/out/ instead.
 */
export function SendTestEmail() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("busy");
    setMsg("");
    try {
      const r = await fetch("/api/email/send", { method: "POST" });
      const j = await r.json();
      if (!r.ok || j.ok === false) {
        setState("fail");
        setMsg(j.detail ?? j.error ?? `HTTP ${r.status}`);
      } else {
        setState("done");
        setMsg(j.detail ?? "Sent");
        router.refresh();
      }
    } catch (e) {
      setState("fail");
      setMsg(String(e));
    }
    setTimeout(() => setState("idle"), 6000);
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className={clsx("max-w-xs truncate text-[11px]", state === "fail" ? "text-down" : "text-fg-3")} title={msg}>{msg}</span>}
      <button
        onClick={run}
        disabled={state === "busy"}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          state === "done" && "border-up/40 bg-up/10 text-up",
          state === "fail" && "border-down/40 bg-down/10 text-down",
          (state === "idle" || state === "busy") && "border-line bg-panel text-fg-2 hover:text-fg",
        )}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : state === "fail" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Mail className={clsx("h-3.5 w-3.5", state === "busy" && "animate-pulse")} />}
        {state === "busy" ? "Running scans + sending…" : "Send test email now"}
      </button>
    </div>
  );
}
