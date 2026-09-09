import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Landmark, Vote } from "lucide-react";
import { policyPanels } from "@/data/eco";
import { getBrief, getEcoSeries, getRunLog } from "@/lib/data";
import { ECO_CATEGORY_META, type EcoCategory, type Geo } from "@/lib/types";
import { fmtClose, fmtDate, fmtPerf, fmtTime, GEO_LABEL } from "@/lib/format";
import { GeoTabs } from "@/components/GeoTabs";
import { RefreshButton } from "@/components/RefreshButton";
import { Badge, Card, CardHeader, Delta, SourceLink } from "@/components/ui";
import { SeriesExplorer } from "@/components/eco/SeriesExplorer";

export const dynamic = "force-dynamic";

const GEOS: Geo[] = ["UK", "US", "CN"];
const CATS: EcoCategory[] = ["activity", "labour", "inflation", "credit", "government", "other"];

export default async function EcoPage({ searchParams }: { searchParams: Promise<{ geo?: string }> }) {
  const [{ geo: g }, brief, eco, runs] = await Promise.all([searchParams, getBrief(), getEcoSeries(), getRunLog()]);
  const geo: Geo = GEOS.includes(g as Geo) ? (g as Geo) : "UK";
  const panel = policyPanels.find((p) => p.geo === geo)!;
  const mkts = brief.markets.filter((m) => m.geo === geo);
  const { series: ecoSeries, liveIds } = eco;
  const lastRefresh = runs.runs.find((r) => r.job === "dashboard.refresh")?.startedAt ?? brief.meta.lastDashboardRefreshAt;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Eco Dashboard</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{GEO_LABEL[geo]} — economic data by theme</h1>
          <p className="mt-1 text-sm text-fg-2">Every series links to its official source. Click a row for the 12-month history. Historical data is seeded once (SQL / DataFrame import) and appended daily.</p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <Suspense><GeoTabs options={GEOS} allLabel={null} /></Suspense>
          <RefreshButton lastRefreshed={`${fmtDate(lastRefresh)} ${fmtTime(lastRefresh)}`} nextRefresh="09:00" />
        </div>
      </header>

      {/* Market / policy panel */}
      <Card>
        <CardHeader title="Market & Policy" sub={`${panel.centralBank} · fiscal calendar · market pricing`} right={<Link href={`/decision-makers?geo=${geo}`} className="hover:text-accent">Decision-maker view →</Link>} />
        <div className="grid gap-px bg-line md:grid-cols-4">
          <div className="bg-panel p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-3"><Landmark className="h-3 w-3" /> {panel.policyRateLabel}</div>
            <div className="num mt-1 text-2xl font-semibold">{panel.policyRate}</div>
            <div className="mt-1 text-[11px] text-fg-3">{panel.marketPricing}</div>
          </div>
          <div className="bg-panel p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-3"><Vote className="h-3 w-3" /> Last decision</div>
            <div className="mt-1 text-sm font-semibold">{panel.lastDecision.action}</div>
            <div className="mt-0.5 text-xs text-fg-2">{fmtDate(panel.lastDecision.date, { day: "2-digit", month: "short", year: "numeric" })} · vote {panel.lastDecision.vote}</div>
            <SourceLink href={panel.lastDecision.url} className="mt-1">Minutes</SourceLink>
          </div>
          <div className="bg-panel p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-3"><CalendarDays className="h-3 w-3" /> Next meeting</div>
            <div className="num mt-1 text-sm font-semibold">{fmtDate(panel.nextMeeting.date, { weekday: "short", day: "2-digit", month: "short" })}</div>
            <div className="mt-0.5 text-xs text-fg-2">{panel.nextMeeting.label}</div>
            <SourceLink href={panel.nextMeeting.url} className="mt-1">Calendar</SourceLink>
          </div>
          <div className="bg-panel p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-3"><CalendarDays className="h-3 w-3" /> Next fiscal event</div>
            <div className="num mt-1 text-sm font-semibold">{fmtDate(panel.nextFiscalEvent.date, { weekday: "short", day: "2-digit", month: "short" })}</div>
            <div className="mt-0.5 text-xs text-fg-2">{panel.nextFiscalEvent.label}</div>
            <SourceLink href={panel.nextFiscalEvent.url} className="mt-1">Details</SourceLink>
          </div>
        </div>
        {mkts.length > 0 && (
          <div className="scrollbar-thin flex gap-px overflow-x-auto border-t border-line bg-line">
            {mkts.map((m) => (
              <a key={m.symbol} href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="min-w-[150px] flex-1 bg-panel px-3 py-2 hover:bg-panel-2">
                <div className="truncate text-[10px] text-fg-3">{m.name}</div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="num text-sm font-semibold">{fmtClose(m)}</span>
                  <Delta v={m.d1} suffix={m.unit === "pct" ? "bp" : "%"} dp={m.unit === "pct" ? 0 : 2} className="text-[11px]" />
                </div>
                <div className="num text-[10px] text-fg-3">YTD {fmtPerf(m.ytd, m.unit)}</div>
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Category grid */}
      <div className="grid gap-4 2xl:grid-cols-2">
        {CATS.map((c) => {
          const rows = ecoSeries.filter((s) => s.geo === geo && s.category === c);
          if (!rows.length) return null;
          const m = ECO_CATEGORY_META[c];
          const nLive = rows.filter((r) => liveIds.has(r.id)).length;
          return (
            <Card key={c} id={c} className="scroll-mt-24">
              <CardHeader title={m.label} sub={m.blurb} right={<span className="flex items-center gap-2">{nLive > 0 && <Badge tone="up">{nLive} live</Badge>}{rows.length} series</span>} />
              <SeriesExplorer series={rows} defaultOpen={c === "inflation" ? rows[0].id : undefined} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
