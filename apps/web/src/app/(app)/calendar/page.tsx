import { Suspense } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarPlus, ChevronLeft, ChevronRight, Rss } from "lucide-react";
import type { CalendarEvent, Geo } from "@/lib/types";
import { getCalendar } from "@/lib/data";
import { fmtTime, relTime } from "@/lib/format";
import { GeoTabs } from "@/components/GeoTabs";
import { ParamToggle } from "@/components/ParamToggle";
import { Badge, Card, CardHeader, Empty, GeoPill, ImportanceDot } from "@/components/ui";

export const dynamic = "force-dynamic";

const GEOS: Geo[] = ["US", "UK", "CN"];
const DAY = 86_400_000;

/** Monday 00:00 (UTC) of the week containing d. */
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Mon=0
  return new Date(x.getTime() - dow * DAY);
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const londonDay = (isoAt: string) => new Date(isoAt).toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // YYYY-MM-DD

function EventCard({ e }: { e: CalendarEvent }) {
  return (
    <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className={clsx("block rounded-md border px-2.5 py-1.5 hover:bg-panel-2", e.importance === "high" ? "border-down/30 bg-down/5" : "border-line/70 bg-panel-2/40 hover:border-line-2")}>
      <div className="flex items-center gap-2 text-[11px]">
        <ImportanceDot level={e.importance} />
        <span className="num text-fg-3">{fmtTime(e.at)}</span>
        <GeoPill geo={e.geo} />
        <span className="ml-auto truncate text-[10px] text-fg-3">{e.source}</span>
      </div>
      <div className="mt-0.5 text-xs font-medium leading-snug text-fg">{e.title}</div>
      {(e.consensus || e.previous || e.actual) && (
        <div className="num mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-fg-3">
          {e.actual && <span>Act <b className="text-fg">{e.actual}</b></span>}
          {e.consensus && <span>Cons <b className="text-fg-2">{e.consensus}</b></span>}
          {e.previous && <span>Prev {e.previous}</span>}
        </div>
      )}
    </a>
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ geo?: string; imp?: string; view?: string; w?: string }> }) {
  const [{ geo, imp, view, w }, { events, live }] = await Promise.all([searchParams, getCalendar()]);
  const sel: Geo | null = GEOS.includes(geo as Geo) ? (geo as Geo) : null;
  const highOnly = imp === "high";
  const now = new Date();
  const start = weekStart(w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? new Date(w + "T00:00:00Z") : now);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY));
  const todayKey = londonDay(now.toISOString());

  const filtered = events
    .filter((e) => (!sel || e.geo === sel || e.geo === "GLOBAL") && (!highOnly || e.importance === "high"))
    .sort((a, b) => a.at.localeCompare(b.at));
  const inWeek = filtered.filter((e) => {
    const k = londonDay(e.at);
    return k >= iso(days[0]) && k <= iso(days[6]);
  });
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of inWeek) {
    const k = londonDay(e.at);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const upcoming = filtered.filter((e) => new Date(e.at) > now);
  const next = upcoming[0];
  const q = new URLSearchParams();
  if (sel) q.set("geo", sel);
  if (highOnly) q.set("imp", "high");
  const wk = (d: Date) => `/calendar?${new URLSearchParams({ ...Object.fromEntries(q), ...(view ? { view } : {}), w: iso(d) })}`;
  const icsHref = `/api/calendar.ics${q.toString() ? "?" + q : ""}`;
  const weekLabel = `${days[0].toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })} – ${days[6].toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Economic Calendar {live ? <Badge tone="up">live scan</Badge> : <Badge tone="neutral">sample data</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Week of {weekLabel}</h1>
          <p className="mt-1 text-sm text-fg-2">High &amp; medium importance releases, central-bank decisions and speeches for US, UK and China. Times in London. Rescraped daily at 05:00; actuals fill in after release.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense><GeoTabs options={GEOS} allLabel="All" /></Suspense>
          <Suspense><ParamToggle param="imp" options={[{ value: "", label: "High + medium" }, { value: "high", label: <span className="flex items-center gap-1"><ImportanceDot level="high" /> High only</span> }]} /></Suspense>
          <Suspense><ParamToggle param="view" options={[{ value: "", label: "Week" }, { value: "list", label: "List" }]} /></Suspense>
          <a href={icsHref} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg" title="Download .ics — or paste this URL into Google/Outlook/Apple Calendar as a subscription">
            <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar (.ics)
          </a>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        <div className="bg-panel p-3"><div className="text-[10px] uppercase tracking-wider text-fg-3">This week</div><div className="num mt-0.5 text-xl font-semibold">{inWeek.length} <span className="text-xs font-normal text-fg-3">events</span></div></div>
        <div className="bg-panel p-3"><div className="text-[10px] uppercase tracking-wider text-fg-3">High impact</div><div className="num mt-0.5 text-xl font-semibold text-down">{inWeek.filter((e) => e.importance === "high").length}</div></div>
        <div className="bg-panel p-3"><div className="text-[10px] uppercase tracking-wider text-fg-3">Next up</div>{next ? <div className="mt-0.5 truncate text-sm font-medium"><span className="num text-fg-3">{relTime(next.at, now)}</span> · {next.title}</div> : <div className="mt-0.5 text-sm text-fg-3">—</div>}</div>
        <div className="bg-panel p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-fg-3"><Rss className="h-3 w-3" /> Subscribe</div>
          <div className="num mt-0.5 truncate text-[11px] text-fg-2" title="Paste into your calendar app as a URL subscription">{icsHref}</div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Link href={wk(new Date(start.getTime() - 7 * DAY))} className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-2.5 py-1 text-xs text-fg-2 hover:text-fg"><ChevronLeft className="h-3.5 w-3.5" /> Previous week</Link>
        <Link href={`/calendar${q.toString() ? "?" + q : ""}`} className="text-xs text-fg-3 hover:text-fg">Today</Link>
        <Link href={wk(new Date(start.getTime() + 7 * DAY))} className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-2.5 py-1 text-xs text-fg-2 hover:text-fg">Next week <ChevronRight className="h-3.5 w-3.5" /></Link>
      </div>

      {view === "list" ? (
        <Card>
          <CardHeader title="All upcoming" sub={`${upcoming.length} events from now`} />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-fg-3">
                <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left"><th>When</th><th></th><th>Event</th><th className="text-right!">Cons</th><th className="text-right!">Prev</th><th className="text-right!">Actual</th><th>Source</th></tr>
              </thead>
              <tbody>
                {upcoming.map((e) => (
                  <tr key={e.id} className="border-t border-line/70 hover:bg-panel-2/40 [&>td]:px-4 [&>td]:py-2">
                    <td className="num whitespace-nowrap text-fg-2">{new Date(e.at).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "Europe/London" })} {fmtTime(e.at)}</td>
                    <td><span className="flex items-center gap-1.5"><ImportanceDot level={e.importance} /><GeoPill geo={e.geo} /></span></td>
                    <td className="font-medium text-fg">{e.title}</td>
                    <td className="num text-right text-fg-2">{e.consensus ?? "—"}</td>
                    <td className="num text-right text-fg-3">{e.previous ?? "—"}</td>
                    <td className="num text-right font-semibold">{e.actual ?? "—"}</td>
                    <td><a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-fg-3 hover:text-accent">{e.source} ↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upcoming.length === 0 && <Empty text="Nothing upcoming for this selection." />}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((d) => {
            const k = iso(d);
            const evs = byDay.get(k) ?? [];
            const isToday = k === todayKey;
            const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
            return (
              <div key={k} className={clsx("flex min-h-[160px] flex-col rounded-lg border bg-panel", isToday ? "border-accent/60" : "border-line", weekend && !evs.length && "opacity-60")}>
                <div className={clsx("flex items-baseline justify-between border-b px-3 py-2", isToday ? "border-accent/40" : "border-line")}>
                  <div className="text-xs font-semibold">{d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })} <span className="num text-fg-3">{d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })}</span></div>
                  {isToday ? <Badge tone="accent">today</Badge> : evs.length > 0 && <span className="num text-[10px] text-fg-3">{evs.length}</span>}
                </div>
                <div className="flex-1 space-y-1.5 p-2">
                  {evs.length === 0 && <div className="px-1 py-2 text-[11px] text-fg-3/60">No events</div>}
                  {evs.map((e) => <EventCard key={e.id} e={e} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
