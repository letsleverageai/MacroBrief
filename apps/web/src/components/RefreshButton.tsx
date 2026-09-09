"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";
import clsx from "clsx";

export function RefreshButton({ lastRefreshed, nextRefresh }: { lastRefreshed: string; nextRefresh: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [stamp, setStamp] = useState(lastRefreshed);

  async function run() {
    setState("busy");
    const r = await fetch("/api/refresh", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setStamp(j.refreshedAt ? new Date(j.refreshedAt).toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : stamp);
    router.refresh(); // re-render server components with whatever the pipeline now holds
    setState("done");
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className="flex items-center gap-3 text-xs text-fg-3">
      <div className="text-right leading-tight">
        <div>Last refreshed <span className="text-fg-2">{stamp}</span></div>
        <div>Auto-refresh daily at <span className="text-fg-2">{nextRefresh}</span> · re-opening does not re-pull</div>
      </div>
      <button
        onClick={run}
        disabled={state === "busy"}
        className={clsx("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors", state === "done" ? "border-up/40 bg-up/10 text-up" : "border-line bg-panel text-fg-2 hover:text-fg")}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : <RefreshCw className={clsx("h-3.5 w-3.5", state === "busy" && "animate-spin")} />}
        {state === "busy" ? "Re-pulling sources…" : state === "done" ? "Updated" : "Re-update now"}
      </button>
    </div>
  );
}
