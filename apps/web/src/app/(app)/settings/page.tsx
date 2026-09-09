import clsx from "clsx";
import { Clock, KeyRound, Mail, ShieldCheck, Users } from "lucide-react";
import { getBrief, getRunLog, pipelineConfigured, pipelineHealth } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { Badge, Card, CardHeader } from "@/components/ui";
import { SendTestEmail } from "@/components/SendTestEmail";

export const dynamic = "force-dynamic";

function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <div>
        <div className="text-xs font-medium text-fg">{label}</div>
        {sub && <div className="text-[11px] text-fg-3">{sub}</div>}
      </div>
      <div className="num text-right text-xs text-fg-2">{value}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const [{ meta }, { runs: runLog, live }, health] = await Promise.all([getBrief(), getRunLog(), pipelineHealth()]);
  const nextEmail = health?.jobs?.find((j) => j.id === "email")?.next;
  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <header className="fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Settings & Runs</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Schedule, delivery, access and pipeline runs</h1>
        <p className="mt-1 text-sm text-fg-2">Everything here is configuration in the pipeline&apos;s <code className="rounded bg-panel-2 px-1">config.yaml</code> and <code className="rounded bg-panel-2 px-1">.env</code>.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {health ? <Badge tone="up">pipeline connected · scheduler running</Badge> : pipelineConfigured ? <Badge tone="down">pipeline unreachable</Badge> : <Badge tone="amber">pipeline not connected — preview mode</Badge>}
          <SendTestEmail />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={<span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Schedule</span>} />
          <div className="divide-y divide-line">
            <Row label="Daily email" value="06:00 Europe/London" sub="Mon–Sat; Sunday sends week-ahead calendar only" />
            <Row label="Dashboard refresh" value="09:00 Europe/London" sub="Re-opening during the day does not re-pull" />
            <Row label="Market scan" value="05:00 (pre-email)" sub="Uses prior-day close; detects holidays" />
            <Row label="Weekly positioning" value="Sat 08:00" sub="CFTC / ICE COT published Fri 20:30 UTC" />
            <Row label="Next email" value={nextEmail ? fmtDateTime(new Date(nextEmail).toISOString()) : fmtDateTime(meta.nextEmailAt)} sub={nextEmail ? "from scheduler" : undefined} />
          </div>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Delivery</span>} />
          <div className="divide-y divide-line">
            <Row label="Recipients" value={meta.recipients.join(", ")} />
            <Row label="Provider" value="Resend (SMTP fallback)" sub="DKIM + SPF on your domain" />
            <Row label="Geographies" value="US · UK · CN" />
            <Row label="News tiers" value="1: BBG/Economist · 2: FT/WSJ · 3: Reuters/other" />
            <Row label="LLM" value={meta.llmModel} sub="Summaries only; never invents numbers — every line cites a URL" />
          </div>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Access & security</span>} />
          <div className="divide-y divide-line">
            <Row label="Accounts" value={<span className="flex items-center gap-1"><Users className="h-3 w-3" /> 1 admin, invite-only</span>} />
            <Row label="2FA (TOTP)" value={<Badge tone="up">enforced</Badge>} />
            <Row label="Sessions" value="12h, HttpOnly, SameSite=Strict" />
            <Row label="Transport" value="Caddy · TLS 1.3 · HSTS" />
            <Row label="Perimeter" value="UFW · fail2ban · SSH keys only" sub="Optional: Cloudflare Access or Tailscale-only" />
            <Row label="API keys" value={<span className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> FRED, Brave, LLM, Resend</span>} sub="Docker secrets; never in the repo" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Run log" sub="Every pipeline job, with what it fetched and what it cost" right={<span className="flex items-center gap-2">{live ? <Badge tone="up">live</Badge> : <Badge tone="neutral">sample</Badge>}{runLog.length} recent</span>} />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-fg-3">
              <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left"><th>Started</th><th>Job</th><th>Duration</th><th>Status</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {runLog.map((r) => (
                <tr key={r.id} className="border-t border-line/70 hover:bg-panel-2/40 [&>td]:px-4 [&>td]:py-2">
                  <td className="num text-fg-2">{fmtDateTime(r.startedAt)}</td>
                  <td className="font-mono text-fg">{r.job}</td>
                  <td className="num text-fg-2">{r.durationSec}s</td>
                  <td><span className={clsx("inline-block h-2 w-2 rounded-full", r.status === "ok" && "bg-up", r.status === "warn" && "bg-amber", r.status === "fail" && "bg-down")} /> <span className="ml-1 uppercase text-fg-3">{r.status}</span></td>
                  <td className="max-w-[560px] truncate text-fg-2" title={r.detail}>{r.detail.split("\n")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
