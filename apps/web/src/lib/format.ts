import type { Geo, MarketRow } from "./types";

export const GEO_LABEL: Record<Geo, string> = { US: "United States", UK: "United Kingdom", CN: "China", GLOBAL: "Global" };
export const GEO_FLAG: Record<Geo, string> = { US: "🇺🇸", UK: "🇬🇧", CN: "🇨🇳", GLOBAL: "🌐" };

export function fmtNum(n: number, dp?: number): string {
  const d = dp ?? (Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 10 ? 2 : 3);
  return n.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtClose(r: MarketRow): string {
  if (r.unit === "pct") return r.close.toFixed(2) + "%";
  if (r.assetClass === "FX") return r.close.toFixed(r.close > 50 ? 2 : 4);
  return fmtNum(r.close);
}

/** Perf: % for prices, bp for yields. */
export function fmtPerf(v: number, unit: MarketRow["unit"]): string {
  const sign = v > 0 ? "+" : "";
  return unit === "pct" ? `${sign}${v.toFixed(0)}bp` : `${sign}${v.toFixed(2)}%`;
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London", ...opts });
}
export function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
}
export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso, { weekday: "short", day: "2-digit", month: "short" })} ${fmtTime(iso)}`;
}
export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" });
}

export function fmtPeriod(p: string): string {
  if (/Q\d/.test(p)) return p.replace("-", " ");
  const [y, m] = p.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function signed(n: number, dp = 1, suffix = ""): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(dp)}${suffix}`;
}

export function relTime(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 90) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}
