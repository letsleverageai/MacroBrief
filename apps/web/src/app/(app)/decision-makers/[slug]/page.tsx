import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { decisionMakerBySlug, decisionMakers } from "@/data/decisionMakers";
import { seriesById } from "@/data/eco";
import { PILLAR_META } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Badge, Card, CardHeader, FlagDot, GeoPill, SourceLink } from "@/components/ui";
import { KpiTile } from "@/components/dm/DecisionMakerCard";
import { SeriesExplorer } from "@/components/eco/SeriesExplorer";

export function generateStaticParams() {
  return decisionMakers.map((d) => ({ slug: d.slug }));
}

export default async function DecisionMakerDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = decisionMakerBySlug(slug);
  if (!d) notFound();
  const linked = (d.linkedSeries ?? []).map(seriesById).filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <Link href="/decision-makers" className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg"><ArrowLeft className="h-3 w-3" /> All decision makers</Link>

      <header className="fade-up flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            {PILLAR_META[d.pillar].label} <GeoPill geo={d.geo} />
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{d.name}</h1>
          <p className="mt-0.5 text-sm text-fg-2">{d.subtitle}</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg" title="In production: edit remit, focus list, KPIs and sources (stored as versioned YAML/JSON)">
          <Pencil className="h-3.5 w-3.5" /> Edit configuration
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Remit & current focus" sub="Editable — rotates with the regime" />
          <div className="space-y-3 p-4">
            <p className="text-sm leading-relaxed text-fg-2">{d.remit}</p>
            <div className="flex flex-wrap gap-1.5">{d.focus.map((f) => <Badge key={f} tone="accent">{f}</Badge>)}</div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Flags" />
          <ul className="space-y-2 p-4">
            {d.flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-fg-2"><FlagDot level={f.level} /> {f.text}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Key indicators" sub="Click a tile for the backing document" />
        <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 xl:grid-cols-4">
          {d.kpis.map((k) => <KpiTile key={k.label} k={k} />)}
        </div>
      </Card>

      {linked.length > 0 && (
        <Card>
          <CardHeader title="Linked economic data" sub="Pulled from the Eco dashboard — backward-looking data next to the decision maker's own forecasts" />
          <SeriesExplorer series={linked} defaultOpen={linked[0].id} />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Latest research, reports & speeches" right={`${d.watchlist.length} items`} />
          <ul className="divide-y divide-line">
            {d.watchlist.map((w) => (
              <li key={w.title} className="flex items-start gap-3 px-4 py-3">
                <FlagDot level={w.severity} />
                <div className="min-w-0 flex-1">
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-fg hover:text-accent">{w.title}</a>
                  <p className="mt-0.5 text-xs text-fg-2">{w.summary}</p>
                </div>
                <div className="num shrink-0 text-[11px] text-fg-3">{fmtDate(w.date, { day: "2-digit", month: "short" })}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Sources" sub="Official publishers post to stable URLs" />
          <ul className="divide-y divide-line">
            {d.sources.map((s) => (
              <li key={s.url} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <SourceLink href={s.url} className="!text-xs !text-fg">{s.name}</SourceLink>
                {s.cadence && <span className="text-[11px] text-fg-3">{s.cadence}</span>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
