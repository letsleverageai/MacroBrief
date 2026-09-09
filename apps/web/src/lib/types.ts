// ---------------------------------------------------------------------------
// MacroBrief data contract.
// Mirrored by pipeline/macrobrief/models.py — keep the two in sync.
// ---------------------------------------------------------------------------

export type Geo = "US" | "UK" | "CN" | "GLOBAL";
export type Importance = "high" | "medium";
export type Surprise = "beat" | "miss" | "inline" | "na";
export type FlagLevel = "red" | "amber" | "green";

export type AssetClass = "Equities" | "Rates" | "FX" | "Commodities";

export interface MarketRow {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  geo: Geo;
  close: number;
  /** "px" = price/index level, "pct" = yield in %, "bp" = basis points */
  unit: "px" | "pct";
  /** Performance fields are in % for prices; in bp for yields. */
  d1: number;
  d5: number;
  mtd: number;
  ytd: number;
  hi52: number;
  lo52: number;
  spark: number[];
  sourceUrl: string;
}

export interface CalendarEvent {
  id: string;
  geo: Geo;
  /** ISO datetime in UTC */
  at: string;
  title: string;
  importance: Importance;
  consensus?: string;
  previous?: string;
  actual?: string;
  source: string;
  sourceUrl: string;
}

export type EcoCategory =
  | "activity"
  | "labour"
  | "inflation"
  | "credit"
  | "government"
  | "other";

export const ECO_CATEGORY_META: Record<
  EcoCategory,
  { label: string; blurb: string }
> = {
  activity: {
    label: "Activity & Spending",
    blurb: "Economic output and who's buying",
  },
  labour: {
    label: "Labour & Household Income",
    blurb: "Purchasing power and wage pressures",
  },
  inflation: { label: "Inflation & Costs", blurb: "Prices and pressure points" },
  credit: {
    label: "Credit, Housing & Financial Transmission",
    blurb: "Financial conditions",
  },
  government: {
    label: "Government & External Sector",
    blurb: "Fiscal constraints and financing needs",
  },
  other: {
    label: "Other",
    blurb: "Surveys and soft data that inform the picture",
  },
};

export interface EcoRelease {
  id: string;
  geo: Geo;
  category: EcoCategory;
  title: string;
  releasedAt: string;
  sourceName: string;
  sourceUrl: string;
  reportUrl: string;
  outcome: string;
  consensus: string;
  surprise: Surprise;
}

export type InstitutionType =
  | "central_bank"
  | "government"
  | "treasury"
  | "regulator"
  | "statistics";

export interface DecisionMakerItem {
  id: string;
  geo: Geo;
  institution: string;
  type: InstitutionType;
  title: string;
  publishedAt: string;
  url: string;
  summary: string;
  tags: string[];
}

export type HeadlineTier = 1 | 2 | 3;

export interface Headline {
  id: string;
  tier: HeadlineTier;
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  geo: Geo;
  /** Present when we had login/full-text access; otherwise title-only. */
  summary?: string;
  access: "full" | "title";
}

export interface SeriesPoint {
  period: string;
  value: number;
}

export interface EcoSeries {
  id: string;
  geo: Geo;
  category: EcoCategory;
  name: string;
  unit: string;
  frequency: "M" | "Q" | "W" | "D";
  latest: SeriesPoint;
  previous: SeriesPoint;
  consensus?: number;
  history: SeriesPoint[];
  sourceName: string;
  sourceUrl: string;
  nextRelease?: string;
  note?: string;
  /** Whether a higher print is "hot" (inflationary / tightening) */
  higherIsHot?: boolean;
}

export interface PolicyPanel {
  geo: Geo;
  centralBank: string;
  policyRateLabel: string;
  policyRate: string;
  lastDecision: { date: string; action: string; vote: string; url: string };
  nextMeeting: { date: string; label: string; url: string };
  nextFiscalEvent: { date: string; label: string; url: string };
  marketPricing: string;
}

export type Pillar = "policy" | "spending_credit" | "market";

export const PILLAR_META: Record<Pillar, { label: string; blurb: string }> = {
  policy: {
    label: "Policy",
    blurb: "Who sets the rules and what they are optimising for",
  },
  spending_credit: {
    label: "Spending & Credit",
    blurb: "Who is spending, borrowing and investing — and what worries them",
  },
  market: {
    label: "Market",
    blurb: "Who owns the risk and how they are positioned",
  },
};

export interface KPI {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  sourceUrl?: string;
}

export interface WatchItem {
  title: string;
  date: string;
  url: string;
  summary: string;
  severity: FlagLevel;
}

export interface Flag {
  level: FlagLevel;
  text: string;
}

export interface SourceRef {
  name: string;
  url: string;
  cadence?: string;
}

export interface DecisionMaker {
  slug: string;
  geo: Geo;
  pillar: Pillar;
  name: string;
  subtitle: string;
  remit: string;
  /** "What's important to them right now" — editable, rotates */
  focus: string[];
  kpis: KPI[];
  watchlist: WatchItem[];
  flags: Flag[];
  sources: SourceRef[];
  /** Linked series IDs from the Eco dashboard */
  linkedSeries?: string[];
}

export interface DataSource {
  id: string;
  name: string;
  geo: Geo;
  feeds: string[];
  method: "API" | "RSS/Atom" | "Scrape" | "CSV" | "LLM";
  cadence: string;
  cost: string;
  url: string;
  status: "live" | "planned" | "needs_login";
}

export interface RunLogEntry {
  id: string;
  job: string;
  startedAt: string;
  durationSec: number;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface BriefMeta {
  asOf: string;
  generatedAt: string;
  timezone: string;
  recipients: string[];
  nextEmailAt: string;
  nextDashboardRefreshAt: string;
  lastDashboardRefreshAt: string;
  llmModel: string;
  costTodayUsd: number;
}
