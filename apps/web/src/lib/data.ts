/**
 * Data access for the dashboard.
 *
 * If PIPELINE_URL is set, every page reads the latest scan from the pipeline API (Postgres/SQLite behind it).
 * Each section falls back to the bundled fixtures when the pipeline is unreachable or has nothing yet, and the
 * result carries `live` flags so the UI can show what is real and what is illustrative.
 */
import { calendar as fxCalendar, decisionMakerFeed as fxDM, ecoReleases as fxReleases, headlines as fxHeadlines, meta as fxMeta, runLog as fxRuns } from "@/data/brief";
import { markets as fxMarkets } from "@/data/markets";
import { ecoSeries as fxEco } from "@/data/eco";
import type { BriefMeta, CalendarEvent, DecisionMakerItem, EcoRelease, EcoSeries, Headline, MarketRow, RunLogEntry } from "./types";

const URL = process.env.PIPELINE_URL?.replace(/\/$/, "");
const TOKEN = process.env.PIPELINE_TOKEN ?? "";

export const pipelineConfigured = !!URL;

// ---------------------------------------------------------------- helpers

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function toCamel<T = unknown>(v: unknown): T {
  if (Array.isArray(v)) return v.map(toCamel) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [camel(k), toCamel(x)])) as T;
  }
  return v as T;
}

async function api<T>(path: string, timeoutMs = 2500): Promise<T | null> {
  if (!URL) return null;
  try {
    const r = await fetch(`${URL}${path}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    return toCamel<T>(await r.json());
  } catch {
    return null;
  }
}

export async function pipelineHealth(): Promise<{ ok: boolean; jobs?: { id: string; next: string }[] } | null> {
  if (!URL) return null;
  try {
    const r = await fetch(`${URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- brief

export interface BriefData {
  meta: BriefMeta;
  oneLiner: string;
  markets: MarketRow[];
  calendar: CalendarEvent[];
  releases: EcoRelease[];
  decisionMakers: DecisionMakerItem[];
  headlines: Headline[];
  live: { any: boolean; markets: boolean; calendar: boolean; releases: boolean; decisionMakers: boolean; headlines: boolean };
}

interface LiveBundle {
  asOf: string;
  generatedAt: string;
  oneLiner?: string;
  markets: MarketRow[];
  calendar: CalendarEvent[];
  releases: EcoRelease[];
  decisionMakers: DecisionMakerItem[];
  headlines: Headline[];
}

function pick<T>(live: T[] | undefined, fixture: T[]): { rows: T[]; live: boolean } {
  return live && live.length ? { rows: live, live: true } : { rows: fixture, live: false };
}

export async function getBrief(): Promise<BriefData> {
  const b = await api<LiveBundle>("/brief/latest.json");
  const m = pick(b?.markets, fxMarkets);
  const c = pick(b?.calendar, fxCalendar);
  const r = pick(b?.releases, fxReleases);
  const d = pick(b?.decisionMakers, fxDM);
  const h = pick(b?.headlines, fxHeadlines);
  const any = !!b;
  return {
    meta: any ? { ...fxMeta, asOf: b!.asOf, generatedAt: b!.generatedAt } : fxMeta,
    oneLiner: b?.oneLiner ?? "",
    markets: m.rows,
    calendar: c.rows,
    releases: r.rows,
    decisionMakers: d.rows,
    headlines: h.rows,
    live: { any, markets: m.live, calendar: c.live, releases: r.live, decisionMakers: d.live, headlines: h.live },
  };
}

export async function getCalendar(): Promise<{ events: CalendarEvent[]; live: boolean }> {
  const live = await api<CalendarEvent[]>("/calendar.json");
  const p = pick(live ?? undefined, fxCalendar);
  return { events: p.rows, live: p.live };
}

// ---------------------------------------------------------------- eco

export async function getEcoSeries(): Promise<{ series: EcoSeries[]; liveIds: Set<string> }> {
  const live = await api<Array<Omit<EcoSeries, "latest" | "previous">>>("/eco-all.json");
  const liveIds = new Set<string>();
  if (!live?.length) return { series: fxEco, liveIds };
  const byId = new Map(live.map((s) => [s.id, s]));
  const merged: EcoSeries[] = fxEco.map((f) => {
    const l = byId.get(f.id);
    if (!l || l.history.length < 2) return f;
    liveIds.add(f.id);
    const h = l.history;
    return { ...f, history: h, latest: h[h.length - 1], previous: h[h.length - 2] };
  });
  // Series configured in the pipeline but not in fixtures
  for (const l of live) {
    if (!fxEco.some((f) => f.id === l.id) && l.history.length >= 2) {
      const h = l.history;
      liveIds.add(l.id);
      merged.push({ ...(l as EcoSeries), latest: h[h.length - 1], previous: h[h.length - 2] });
    }
  }
  return { series: merged, liveIds };
}

// ---------------------------------------------------------------- runs

export async function getRunLog(): Promise<{ runs: RunLogEntry[]; live: boolean }> {
  const live = await api<Array<{ id: number; job: string; startedAt: string; durationSec: number; status: RunLogEntry["status"]; detail: string }>>("/runs.json");
  if (!live?.length) return { runs: fxRuns, live: false };
  return {
    live: true,
    runs: live.map((r) => ({ id: String(r.id), job: r.job, startedAt: r.startedAt, durationSec: Math.round(r.durationSec), status: r.status, detail: r.detail })),
  };
}
