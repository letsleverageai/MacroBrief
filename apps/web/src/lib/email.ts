/**
 * Renders the 06:00 Daily Brief as email-safe HTML (tables + inline styles, no JS, light theme
 * so it reads well in Outlook/Gmail/Apple Mail). The Python pipeline has a Jinja template with the
 * same structure (pipeline/macrobrief/templates/daily_brief.html.j2).
 */
import type { CalendarEvent, DecisionMakerItem, EcoRelease, Headline, MarketRow } from "@/lib/types";
import { dayKey, fmtClose, fmtDateLong, fmtPerf, fmtTime } from "@/lib/format";

const C = {
  text: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  bg: "#f5f6f8",
  card: "#ffffff",
  accent: "#b7791f",
  up: "#15803d",
  down: "#b91c1c",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const perf = (v: number, unit: MarketRow["unit"]) =>
  `<span style="color:${v > 0 ? C.up : v < 0 ? C.down : C.muted};font-family:ui-monospace,Menlo,monospace">${fmtPerf(v, unit)}</span>`;

function section(n: string, title: string, blurb: string, body: string) {
  return `
  <tr><td style="padding:28px 0 8px">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.accent};font-weight:700">${n} · ${esc(title)}</div>
    <div style="font-size:12px;color:${C.muted};margin-top:2px">${esc(blurb)}</div>
  </td></tr>
  <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:8px;padding:0">${body}</td></tr>`;
}

function marketTable(rows: MarketRow[]) {
  const classes = ["Equities", "Rates", "FX", "Commodities"] as const;
  return classes
    .map((cls) => {
      const r = rows.filter((x) => x.assetClass === cls);
      if (!r.length) return "";
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px">
        <tr style="background:#fafafa"><td colspan="7" style="padding:8px 12px;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};border-bottom:1px solid ${C.line}">${cls}${cls === "Rates" ? " <span style='font-weight:400'>(yield %, changes bp)</span>" : ""}</td></tr>
        <tr style="color:${C.muted};font-size:10px;text-transform:uppercase">
          <td style="padding:6px 12px">Instrument</td><td align="right" style="padding:6px 8px">Close</td><td align="right" style="padding:6px 8px">1D</td><td align="right" style="padding:6px 8px">5D</td><td align="right" style="padding:6px 8px">MTD</td><td align="right" style="padding:6px 8px">YTD</td><td align="right" style="padding:6px 12px">52w lo–hi</td>
        </tr>
        ${r
          .map(
            (m) => `<tr style="border-top:1px solid ${C.line}">
          <td style="padding:6px 12px"><span style="color:${C.muted};font-size:10px">${m.geo}</span> <a href="${m.sourceUrl}" style="color:${C.text};text-decoration:none;font-weight:600">${esc(m.name)}</a></td>
          <td align="right" style="padding:6px 8px;font-family:ui-monospace,Menlo,monospace;font-weight:600">${fmtClose(m)}</td>
          <td align="right" style="padding:6px 8px">${perf(m.d1, m.unit)}</td>
          <td align="right" style="padding:6px 8px">${perf(m.d5, m.unit)}</td>
          <td align="right" style="padding:6px 8px">${perf(m.mtd, m.unit)}</td>
          <td align="right" style="padding:6px 8px">${perf(m.ytd, m.unit)}</td>
          <td align="right" style="padding:6px 12px;color:${C.muted};font-family:ui-monospace,Menlo,monospace;font-size:11px">${m.lo52.toLocaleString("en-GB", { maximumFractionDigits: 2 })} – ${m.hi52.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</td>
        </tr>`,
          )
          .join("")}
      </table>`;
    })
    .join("");
}

function calendarTable(events: CalendarEvent[]) {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const days = new Map<string, CalendarEvent[]>();
  for (const e of sorted) days.set(dayKey(e.at), [...(days.get(dayKey(e.at)) ?? []), e]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px">
    ${[...days.entries()]
      .map(
        ([day, evs]) => `
      <tr style="background:#fafafa"><td colspan="4" style="padding:8px 12px;font-weight:700;border-bottom:1px solid ${C.line}">${esc(day)}</td></tr>
      ${evs
        .map(
          (e) => `<tr style="border-top:1px solid ${C.line}">
        <td style="padding:6px 12px;width:52px;font-family:ui-monospace,Menlo,monospace;color:${C.muted}">${fmtTime(e.at)}</td>
        <td style="padding:6px 8px;width:36px"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${e.importance === "high" ? C.down : "#d97706"}"></span> <b style="font-size:10px;color:${C.muted}">${e.geo}</b></td>
        <td style="padding:6px 8px"><a href="${e.sourceUrl}" style="color:${C.text};text-decoration:none;font-weight:600">${esc(e.title)}</a> <span style="color:${C.muted};font-size:11px">· ${esc(e.source)}</span></td>
        <td align="right" style="padding:6px 12px;color:${C.muted};font-size:11px;white-space:nowrap">${e.actual ? `Act <b style="color:${C.text}">${esc(e.actual)}</b> · ` : ""}${e.consensus ? `Cons <b>${esc(e.consensus)}</b>` : ""}${e.previous ? ` · Prev ${esc(e.previous)}` : ""}</td>
      </tr>`,
        )
        .join("")}`,
      )
      .join("")}
  </table>`;
}

function releases(list: EcoRelease[]) {
  return list
    .map(
      (r, i) => `<div style="padding:12px;${i ? `border-top:1px solid ${C.line}` : ""}">
      <div style="font-size:11px;color:${C.muted}"><b>${r.geo}</b> · ${esc(r.sourceName)} · <span style="color:${r.surprise === "beat" ? C.up : r.surprise === "miss" ? C.down : C.muted};font-weight:700">${r.surprise.toUpperCase()}</span></div>
      <div style="font-size:14px;font-weight:700;margin:2px 0 6px"><a href="${r.sourceUrl}" style="color:${C.text};text-decoration:none">${esc(r.title)}</a></div>
      <div style="font-size:12px;line-height:1.5"><b style="color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:.06em">Outcome</b> &nbsp;${esc(r.outcome)}</div>
      <div style="font-size:12px;line-height:1.5;margin-top:2px"><b style="color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:.06em">Consensus</b> &nbsp;${esc(r.consensus)}</div>
      <div style="font-size:11px;margin-top:6px"><a href="${r.reportUrl}" style="color:${C.accent}">Full report →</a></div>
    </div>`,
    )
    .join("");
}

function dmItems(list: DecisionMakerItem[]) {
  return [...list]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(
      (d, i) => `<div style="padding:12px;${i ? `border-top:1px solid ${C.line}` : ""}">
      <div style="font-size:11px;color:${C.muted}"><b>${d.geo}</b> · ${esc(d.institution)} · ${new Date(d.publishedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
      <div style="font-size:13px;font-weight:700;margin:2px 0 4px"><a href="${d.url}" style="color:${C.text};text-decoration:none">${esc(d.title)}</a></div>
      <div style="font-size:12px;line-height:1.5;color:#374151">${esc(d.summary)}</div>
    </div>`,
    )
    .join("");
}

function news(list: Headline[]) {
  const tiers: Record<1 | 2 | 3, string> = { 1: "Tier 1 — Bloomberg · Economist", 2: "Tier 2 — FT · WSJ", 3: "Tier 3 — Reuters · other" };
  return ([1, 2, 3] as const)
    .map((t) => {
      const items = list.filter((h) => h.tier === t);
      if (!items.length) return "";
      return `<div style="padding:8px 12px;background:#fafafa;border-bottom:1px solid ${C.line};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};font-weight:700">${tiers[t]}</div>
      ${items
        .map(
          (h) => `<div style="padding:10px 12px;border-bottom:1px solid ${C.line}">
        <div style="font-size:11px;color:${C.muted}"><b>${h.geo}</b> · ${esc(h.source)} · ${fmtTime(h.publishedAt)}${h.access === "title" ? " · <i>title only</i>" : ""}</div>
        <div style="font-size:13px;font-weight:600;margin-top:2px"><a href="${h.url}" style="color:${C.text};text-decoration:none">${esc(h.title)}</a></div>
        ${h.summary ? `<div style="font-size:12px;color:#374151;margin-top:2px;line-height:1.5">${esc(h.summary)}</div>` : ""}
      </div>`,
        )
        .join("")}`;
    })
    .join("");
}

export function renderDailyBriefEmail(input: {
  asOf: string;
  generatedAt: string;
  dashboardUrl: string;
  markets: MarketRow[];
  calendar: CalendarEvent[];
  releases: EcoRelease[];
  decisionMakers: DecisionMakerItem[];
  headlines: Headline[];
  oneLiner?: string;
  live?: boolean;
}): string {
  const oneLiner = input.oneLiner || "Treasuries rally on soft payrolls (10Y 4.08%, -3bp); gilts follow (10Y 4.45%); China exports beat while imports lag; Brent -1.2% on OPEC+ hike; gold at a record $3,640. Week ahead: US CPI Thu, ECB Thu, UK GDP Fri; next week FOMC (16th), UK CPI (16th), BoE (17th).";
  const title = `MacroBrief — ${fmtDateLong(input.asOf + "T06:00:00Z")}`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${C.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%">
  <tr><td style="padding:0 0 12px">
    <table role="presentation" width="100%"><tr>
      <td><div style="display:inline-block;background:#f5b942;color:#0b0e14;font-weight:900;width:28px;height:28px;line-height:28px;text-align:center;border-radius:6px;font-size:16px">M</div>
      <span style="font-weight:700;font-size:16px;margin-left:8px;vertical-align:top;line-height:28px">MacroBrief</span></td>
      <td align="right" style="font-size:11px;color:${C.muted}">US · UK · CN<br>${fmtDateLong(input.asOf + "T06:00:00Z")} · 06:00 London</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:8px;padding:14px 16px;font-size:13px;line-height:1.55">
    <b>Overnight in one line.</b> ${esc(oneLiner)}
    <div style="margin-top:8px;font-size:11px;color:${C.muted}">Open the <a href="${input.dashboardUrl}" style="color:${C.accent}">dashboard</a> for charts, decision-maker views and history. Every line below links to its source.</div>
  </td></tr>

  ${section("01", "Market Summary", "Close, 1D, 5D, MTD, YTD, 52-week range", marketTable(input.markets))}
  ${section("02", "Economic Calendar", "High & medium importance · London time", calendarTable(input.calendar))}
  ${section("03", "Economic Summary", "Key releases read; one line on outcome, one on consensus", releases(input.releases))}
  ${section("04", "Decision Maker Summary", "Central banks, government, treasury, regulators", dmItems(input.decisionMakers))}
  ${section("05", "Global Summary", "Bloomberg/Economist › FT/WSJ › Reuters/other", news(input.headlines))}

  <tr><td style="padding:20px 0 0;font-size:11px;color:${C.muted};line-height:1.6">
    Generated ${new Date(input.generatedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })} London. Summaries are machine-generated from the linked documents; numbers are quoted from the source, not inferred.${input.live ? "" : " Preview — illustrative data."}<br>
    <a href="${input.dashboardUrl}/settings" style="color:${C.muted}">Manage schedule & recipients</a>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}
