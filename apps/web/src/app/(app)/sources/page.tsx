import { sources } from "@/data/sources";
import { Badge, Card, CardHeader, GeoPill, SourceLink } from "@/components/ui";

const STATUS: Record<string, { label: string; tone: "up" | "amber" | "info" }> = {
  live: { label: "live", tone: "up" },
  planned: { label: "planned", tone: "info" },
  needs_login: { label: "needs login", tone: "amber" },
};

export default function SourcesPage() {
  const live = sources.filter((s) => s.status === "live").length;
  const paid = sources.filter((s) => !/^free/i.test(s.cost));
  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <header className="fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Sources</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Source registry</h1>
        <p className="mt-1 text-sm text-fg-2">
          {sources.length} sources · {live} live · {paid.length} with any marginal cost. Everything else is official, free and posted to a stable URL — the initial link rarely needs updating.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Marginal cost / day", "≈ $0.30", "LLM summaries + Brave overage"],
          ["Server", "€4.5 / mo", "Hetzner CX22 (2 vCPU, 4GB)"],
          ["Email", "Free", "Resend 3k/mo or Postmark 100/mo"],
          ["Total", "≈ €14 / mo", "excluding your publisher logins"],
        ].map(([k, v, s]) => (
          <div key={k} className="rounded-lg border border-line bg-panel px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-fg-3">{k}</div>
            <div className="num mt-1 text-xl font-semibold">{v}</div>
            <div className="text-[11px] text-fg-3">{s}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Registry" sub="Method · cadence · cost · status" />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-fg-3">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>Source</th><th>Geo</th><th>Feeds</th><th>Method</th><th>Cadence</th><th>Cost</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-t border-line/70 align-top hover:bg-panel-2/40 [&>td]:px-3 [&>td]:py-2">
                  <td><SourceLink href={s.url} className="!text-xs !text-fg">{s.name}</SourceLink></td>
                  <td><GeoPill geo={s.geo} /></td>
                  <td className="max-w-[320px] text-fg-2">{s.feeds.join(" · ")}</td>
                  <td><Badge>{s.method}</Badge></td>
                  <td className="text-fg-2">{s.cadence}</td>
                  <td className="text-fg-2">{s.cost}</td>
                  <td><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
