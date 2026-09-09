import type { MarketRow } from "@/lib/types";

/** Deterministic pseudo-random walk so sparklines look real and are stable across renders. */
function spark(close: number, ytdPct: number, seed: number, n = 24): number[] {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  const start = close / (1 + ytdPct / 100);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const drift = start + (close - start) * t;
    const noise = drift * rnd() * 0.018;
    out.push(+(drift + noise).toFixed(4));
  }
  out[n - 1] = close;
  return out;
}

const YF = (s: string) => `https://finance.yahoo.com/quote/${encodeURIComponent(s)}`;

type Seed = Omit<MarketRow, "spark" | "sourceUrl"> & { sourceUrl?: string };

const rows: Seed[] = [
  // ---------------- Equities ----------------
  { symbol: "^GSPC", name: "S&P 500", assetClass: "Equities", geo: "US", unit: "px", close: 6842.15, d1: 0.34, d5: 0.92, mtd: 0.71, ytd: 16.3, hi52: 6871.4, lo52: 4835.0 },
  { symbol: "^NDX", name: "Nasdaq 100", assetClass: "Equities", geo: "US", unit: "px", close: 24910.6, d1: 0.58, d5: 1.41, mtd: 1.02, ytd: 18.6, hi52: 25012.3, lo52: 16542.2 },
  { symbol: "^DJI", name: "Dow Jones", assetClass: "Equities", geo: "US", unit: "px", close: 46120.2, d1: 0.12, d5: 0.45, mtd: 0.38, ytd: 8.4, hi52: 46310.0, lo52: 36611.8 },
  { symbol: "^RUT", name: "Russell 2000", assetClass: "Equities", geo: "US", unit: "px", close: 2310.4, d1: -0.21, d5: 0.88, mtd: 0.55, ytd: 3.6, hi52: 2442.7, lo52: 1732.3 },
  { symbol: "^VIX", name: "VIX", assetClass: "Equities", geo: "US", unit: "px", close: 15.82, d1: -4.1, d5: -8.2, mtd: -6.4, ytd: -8.9, hi52: 60.1, lo52: 12.7 },
  { symbol: "^FTSE", name: "FTSE 100", assetClass: "Equities", geo: "UK", unit: "px", close: 9410.7, d1: 0.22, d5: -0.35, mtd: 0.14, ytd: 15.1, hi52: 9482.5, lo52: 7544.8 },
  { symbol: "^FTMC", name: "FTSE 250", assetClass: "Equities", geo: "UK", unit: "px", close: 22180.3, d1: 0.41, d5: -0.12, mtd: 0.62, ytd: 7.9, hi52: 22540.0, lo52: 17698.0 },
  { symbol: "000001.SS", name: "Shanghai Composite", assetClass: "Equities", geo: "CN", unit: "px", close: 3612.4, d1: -0.62, d5: -1.85, mtd: -1.1, ytd: 7.8, hi52: 3742.8, lo52: 3040.7 },
  { symbol: "000300.SS", name: "CSI 300", assetClass: "Equities", geo: "CN", unit: "px", close: 4205.9, d1: -0.85, d5: -2.3, mtd: -1.6, ytd: 6.9, hi52: 4390.1, lo52: 3534.7 },
  { symbol: "^HSI", name: "Hang Seng", assetClass: "Equities", geo: "CN", unit: "px", close: 25480.1, d1: -0.48, d5: -1.2, mtd: -0.7, ytd: 27.0, hi52: 26120.0, lo52: 19260.6 },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50", assetClass: "Equities", geo: "GLOBAL", unit: "px", close: 5480.2, d1: 0.15, d5: 0.6, mtd: 0.3, ytd: 12.1, hi52: 5568.0, lo52: 4540.2 },
  { symbol: "^N225", name: "Nikkei 225", assetClass: "Equities", geo: "GLOBAL", unit: "px", close: 41250.8, d1: 0.72, d5: 1.9, mtd: 1.3, ytd: 3.4, hi52: 43876.0, lo52: 30792.7 },

  // ---------------- Rates (yields, %; perf in bp) ----------------
  { symbol: "US2Y", name: "US 2Y Treasury", assetClass: "Rates", geo: "US", unit: "pct", close: 3.62, d1: -4, d5: -11, mtd: -9, ytd: -62, hi52: 4.38, lo52: 3.55 },
  { symbol: "US10Y", name: "US 10Y Treasury", assetClass: "Rates", geo: "US", unit: "pct", close: 4.08, d1: -3, d5: -14, mtd: -12, ytd: -49, hi52: 4.81, lo52: 3.98 },
  { symbol: "US30Y", name: "US 30Y Treasury", assetClass: "Rates", geo: "US", unit: "pct", close: 4.72, d1: -2, d5: -10, mtd: -9, ytd: -6, hi52: 5.15, lo52: 4.42 },
  { symbol: "GB2Y", name: "UK 2Y Gilt", assetClass: "Rates", geo: "UK", unit: "pct", close: 3.78, d1: -2, d5: -7, mtd: -5, ytd: -44, hi52: 4.52, lo52: 3.71 },
  { symbol: "GB10Y", name: "UK 10Y Gilt", assetClass: "Rates", geo: "UK", unit: "pct", close: 4.45, d1: -3, d5: -12, mtd: -10, ytd: -12, hi52: 4.93, lo52: 4.28 },
  { symbol: "GB30Y", name: "UK 30Y Gilt", assetClass: "Rates", geo: "UK", unit: "pct", close: 5.18, d1: -4, d5: -15, mtd: -12, ytd: 5, hi52: 5.72, lo52: 4.98 },
  { symbol: "CN10Y", name: "China 10Y CGB", assetClass: "Rates", geo: "CN", unit: "pct", close: 1.82, d1: 1, d5: 3, mtd: 2, ytd: 14, hi52: 1.91, lo52: 1.59 },
  { symbol: "DE10Y", name: "Germany 10Y Bund", assetClass: "Rates", geo: "GLOBAL", unit: "pct", close: 2.61, d1: -2, d5: -8, mtd: -6, ytd: 24, hi52: 2.93, lo52: 2.36 },

  // ---------------- FX ----------------
  { symbol: "DX-Y.NYB", name: "US Dollar Index (DXY)", assetClass: "FX", geo: "US", unit: "px", close: 98.42, d1: -0.18, d5: -0.65, mtd: -0.4, ytd: -9.3, hi52: 110.2, lo52: 96.4 },
  { symbol: "GBPUSD=X", name: "GBP/USD", assetClass: "FX", geo: "UK", unit: "px", close: 1.341, d1: 0.24, d5: 0.71, mtd: 0.5, ytd: 7.2, hi52: 1.3788, lo52: 1.2102 },
  { symbol: "EURGBP=X", name: "EUR/GBP", assetClass: "FX", geo: "UK", unit: "px", close: 0.8665, d1: -0.08, d5: -0.22, mtd: -0.1, ytd: 4.8, hi52: 0.8745, lo52: 0.8226 },
  { symbol: "EURUSD=X", name: "EUR/USD", assetClass: "FX", geo: "GLOBAL", unit: "px", close: 1.162, d1: 0.16, d5: 0.5, mtd: 0.4, ytd: 12.2, hi52: 1.1919, lo52: 1.0178 },
  { symbol: "USDJPY=X", name: "USD/JPY", assetClass: "FX", geo: "GLOBAL", unit: "px", close: 146.2, d1: -0.35, d5: -0.9, mtd: -0.6, ytd: -7.0, hi52: 158.9, lo52: 139.6 },
  { symbol: "USDCNY=X", name: "USD/CNY (onshore)", assetClass: "FX", geo: "CN", unit: "px", close: 7.115, d1: -0.05, d5: -0.21, mtd: -0.15, ytd: -2.5, hi52: 7.35, lo52: 7.09 },
  { symbol: "USDCNH=X", name: "USD/CNH (offshore)", assetClass: "FX", geo: "CN", unit: "px", close: 7.108, d1: -0.06, d5: -0.25, mtd: -0.18, ytd: -2.9, hi52: 7.43, lo52: 7.08 },

  // ---------------- Commodities ----------------
  { symbol: "BZ=F", name: "Brent Crude ($/bbl)", assetClass: "Commodities", geo: "GLOBAL", unit: "px", close: 68.4, d1: -1.2, d5: -2.8, mtd: -1.9, ytd: -8.4, hi52: 82.6, lo52: 58.4 },
  { symbol: "CL=F", name: "WTI Crude ($/bbl)", assetClass: "Commodities", geo: "US", unit: "px", close: 65.1, d1: -1.3, d5: -3.1, mtd: -2.2, ytd: -9.2, hi52: 80.8, lo52: 55.1 },
  { symbol: "GC=F", name: "Gold ($/oz)", assetClass: "Commodities", geo: "GLOBAL", unit: "px", close: 3640.2, d1: 0.9, d5: 2.4, mtd: 1.8, ytd: 38.7, hi52: 3658.0, lo52: 2540.1 },
  { symbol: "SI=F", name: "Silver ($/oz)", assetClass: "Commodities", geo: "GLOBAL", unit: "px", close: 41.2, d1: 1.4, d5: 3.6, mtd: 2.5, ytd: 42.5, hi52: 41.9, lo52: 27.8 },
  { symbol: "HG=F", name: "Copper ($/lb)", assetClass: "Commodities", geo: "CN", unit: "px", close: 4.58, d1: -0.4, d5: 0.8, mtd: 0.6, ytd: 14.5, hi52: 5.82, lo52: 3.98 },
  { symbol: "NG=F", name: "Henry Hub Gas ($/MMBtu)", assetClass: "Commodities", geo: "US", unit: "px", close: 3.05, d1: 2.1, d5: 4.8, mtd: 3.2, ytd: -16.0, hi52: 4.9, lo52: 2.6 },
  { symbol: "TTF=F", name: "TTF Gas (€/MWh)", assetClass: "Commodities", geo: "UK", unit: "px", close: 33.5, d1: -0.9, d5: -2.6, mtd: -1.5, ytd: -32.4, hi52: 58.2, lo52: 31.1 },
  { symbol: "TIO=F", name: "Iron Ore 62% ($/t)", assetClass: "Commodities", geo: "CN", unit: "px", close: 101.5, d1: -0.7, d5: -1.4, mtd: -0.9, ytd: 0.4, hi52: 110.3, lo52: 92.4 },
];

export const markets: MarketRow[] = rows.map((r, i) => ({
  ...r,
  sourceUrl: r.sourceUrl ?? YF(r.symbol),
  spark: spark(r.close, r.unit === "pct" ? r.ytd / 4 : r.ytd, i + 7),
}));

export const marketsByClass = (cls: MarketRow["assetClass"]) =>
  markets.filter((m) => m.assetClass === cls);
