import clsx from "clsx";
import { FileText, Link2 } from "lucide-react";
import type { AssetClass, CalendarEvent, DecisionMakerItem, EcoRelease, Geo, Headline, MarketRow } from "@/lib/types";
import { dayKey, fmtClose, fmtDateTime, fmtTime, fmtDate } from "@/lib/format";
import { Badge, Card, CardHeader, Delta, Empty, GeoPill, ImportanceDot, Range52, SourceLink, Sparkline, SurpriseBadge } from "@/components/ui";

// ------------------------------------------------------------------
// 1. Market Summary
// ------------------------------------------------------------------
const CLASSES: AssetClass[] = ["Equities", "Rates", "FX", "Commodities"];

export function MarketSummary({ rows }: { rows: MarketRow[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {CLASSES.map((cls) => {
        const r = rows.filter((x) => x.assetClass === cls);
        if (!r.length) return null;
        return (
          <Card key={cls}>
            <CardHeader title={cls} sub={cls === "Rates" ? "Yields in %, changes in bp" : "Levels, changes in %"} right={`${r.length} instruments`} />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-fg-3">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-right [&>th:first-child]:text-left">
                    <th>Instrument</th><th>Close</th><th>1D</th><th>5D</th><th>MTD</th><th>YTD</th><th className="!text-center">52w range</th><th className="!text-center">1M</th>
                  </tr>
                </thead>
                <tbody>
                  {r.map((m) => (
                    <tr key={m.symbol} className="border-t border-line/70 hover:bg-panel-2/50 [&>td]:px-3 [&>td]:py-1.5 [&>td]:text-right [&>td:first-child]:text-left">
                      <td>
                        <div className="flex items-center gap-2">
                          <GeoPill geo={m.geo} />
                          <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-fg hover:text-accent">{m.name}</a>
                        </div>
                      </td>
                      <td className="num font-semibold text-fg">{fmtClose(m)}</td>
                      <td><Delta v={m.d1} suffix={m.unit === "pct" ? "bp" : "%"} dp={m.unit === "pct" ? 0 : 2} /></td>
                      <td><Delta v={m.d5} suffix={m.unit === "pct" ? "bp" : "%"} dp={m.unit === "pct" ? 0 : 2} /></td>
                      <td><Delta v={m.mtd} suffix={m.unit === "pct" ? "bp" : "%"} dp={m.unit === "pct" ? 0 : 2} /></td>
                      <td><Delta v={m.ytd} suffix={m.unit === "pct" ? "bp" : "%"} dp={m.unit === "pct" ? 0 : 1} /></td>
                      <td>
                        <div className="flex flex-col items-center gap-0.5">
                          <Range52 lo={m.lo52} hi={m.hi52} v={m.close} />
                          <div className="num text-[9px] text-fg-3">{m.unit === "pct" ? `${m.lo52.toFixed(2)} – ${m.hi52.toFixed(2)}` : `${m.lo52.toLocaleString("en-GB", { maximumFractionDigits: 2 })} – ${m.hi52.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`}</div>
                        </div>
                      </td>
                      <td><div className="flex justify-center"><Sparkline data={m.spark} tone={m.unit === "pct" ? (m.mtd <= 0 ? "up" : "down") : undefined} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// 2. Economic Calendar
// ------------------------------------------------------------------
export function EcoCalendar({ events, geos }: { events: CalendarEvent[]; geos: Geo[] }) {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const days = new Map<string, CalendarEvent[]>();
  for (const e of sorted) {
    const k = dayKey(e.at);
    days.set(k, [...(days.get(k) ?? []), e]);
  }
  const cols: Geo[] = geos.filter((g) => g !== "GLOBAL");
  return (
    <Card>
      <CardHeader title="This week & next" sub="High and medium importance only · times in London" right={<span className="flex items-center gap-3"><span className="flex items-center gap-1"><ImportanceDot level="high" /> High</span><span className="flex items-center gap-1"><ImportanceDot level="medium" /> Medium</span></span>} />
      <div className="divide-y divide-line">
        {[...days.entries()].map(([day, evs]) => (
          <div key={day} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[150px_1fr]">
            <div className="text-xs font-semibold text-fg-2">{day}</div>
            <div className={clsx("grid gap-3", cols.length > 1 && "md:grid-cols-3")}>
              {(cols.length ? cols : ["GLOBAL" as Geo]).map((g) => {
                const list = evs.filter((e) => e.geo === g || (g === cols[0] && e.geo === "GLOBAL"));
                return (
                  <div key={g} className="space-y-1.5">
                    {list.length === 0 && <div className="text-[11px] text-fg-3/60">—</div>}
                    {list.map((e) => (
                      <a key={e.id} href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="block rounded-md border border-line/70 bg-panel-2/40 px-2.5 py-1.5 hover:border-line-2 hover:bg-panel-2">
                        <div className="flex items-center gap-2 text-[11px]">
                          <ImportanceDot level={e.importance} />
                          <span className="num text-fg-3">{fmtTime(e.at)}</span>
                          <GeoPill geo={e.geo} />
                          <span className="ml-auto text-[10px] text-fg-3">{e.source}</span>
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-fg">{e.title}</div>
                        {(e.consensus || e.previous || e.actual) && (
                          <div className="num mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-fg-3">
                            {e.actual && <span>Act <b className="text-fg">{e.actual}</b></span>}
                            {e.consensus && <span>Cons <b className="text-fg-2">{e.consensus}</b></span>}
                            {e.previous && <span>Prev {e.previous}</span>}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {days.size === 0 && <Empty text="No high/medium events for this selection." />}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------
// 3. Economic Summary (reads the reports)
// ------------------------------------------------------------------
export function EcoSummary({ releases }: { releases: EcoRelease[] }) {
  if (!releases.length) return <Empty text="No key releases in the last 48 hours." />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {releases.map((r) => (
        <Card key={r.id} className="flex flex-col">
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-fg-3">
                <GeoPill geo={r.geo} />
                <span>{r.sourceName}</span>
                <span>·</span>
                <span>{fmtDateTime(r.releasedAt)}</span>
              </div>
              <h4 className="mt-1 text-sm font-semibold text-fg">{r.title}</h4>
            </div>
            <SurpriseBadge s={r.surprise} />
          </div>
          <dl className="mt-3 grid gap-2 px-4 text-xs">
            <div className="grid grid-cols-[76px_1fr] gap-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">Outcome</dt>
              <dd className="text-fg-2">{r.outcome}</dd>
            </div>
            <div className="grid grid-cols-[76px_1fr] gap-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">Consensus</dt>
              <dd className="text-fg-2">{r.consensus}</dd>
            </div>
          </dl>
          <div className="mt-auto flex items-center gap-4 border-t border-line px-4 py-2">
            <SourceLink href={r.sourceUrl}><Link2 className="h-3 w-3" /> Release page</SourceLink>
            <SourceLink href={r.reportUrl}><FileText className="h-3 w-3" /> Full report</SourceLink>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// 4. Decision Maker Summary
// ------------------------------------------------------------------
const TYPE_LABEL: Record<DecisionMakerItem["type"], string> = {
  central_bank: "Central banks",
  treasury: "Treasury / finance ministry",
  government: "Government & fiscal bodies",
  regulator: "Regulators",
  statistics: "Statistical agencies",
};
const TYPE_ORDER: DecisionMakerItem["type"][] = ["central_bank", "treasury", "government", "regulator", "statistics"];

export function DecisionMakerSummary({ items }: { items: DecisionMakerItem[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {TYPE_ORDER.map((t) => {
        const list = items.filter((i) => i.type === t).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        if (!list.length) return null;
        return (
          <Card key={t}>
            <CardHeader title={TYPE_LABEL[t]} right={`${list.length} new`} />
            <ul className="divide-y divide-line">
              {list.map((i) => (
                <li key={i.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] text-fg-3">
                    <GeoPill geo={i.geo} />
                    <span className="font-medium text-fg-2">{i.institution}</span>
                    <span>·</span>
                    <span>{fmtDate(i.publishedAt, { day: "2-digit", month: "short" })}</span>
                  </div>
                  <a href={i.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium text-fg hover:text-accent">{i.title}</a>
                  <p className="mt-1 text-xs leading-relaxed text-fg-2">{i.summary}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">{i.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// 5. Global Summary (news, tiered)
// ------------------------------------------------------------------
const TIER_LABEL: Record<Headline["tier"], { label: string; sub: string }> = {
  1: { label: "Tier 1", sub: "Bloomberg · The Economist" },
  2: { label: "Tier 2", sub: "FT · WSJ" },
  3: { label: "Tier 3", sub: "Reuters · BBC · other" },
};

export function GlobalSummary({ items }: { items: Headline[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {([1, 2, 3] as const).map((tier) => {
        const list = items.filter((h) => h.tier === tier).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        return (
          <Card key={tier}>
            <CardHeader title={TIER_LABEL[tier].label} sub={TIER_LABEL[tier].sub} right={list.some((h) => h.access === "title") ? <Badge tone="amber">title-only (no login)</Badge> : <Badge tone="up">full text</Badge>} />
            <ul className="divide-y divide-line">
              {list.map((h) => (
                <li key={h.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] text-fg-3">
                    <GeoPill geo={h.geo} />
                    <span className="font-medium text-fg-2">{h.source}</span>
                    <span>·</span>
                    <span>{fmtTime(h.publishedAt)}</span>
                  </div>
                  <a href={h.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-medium leading-snug text-fg hover:text-accent">{h.title}</a>
                  {h.summary && <p className="mt-1 text-xs leading-relaxed text-fg-2">{h.summary}</p>}
                </li>
              ))}
              {!list.length && <Empty text="No headlines." />}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
