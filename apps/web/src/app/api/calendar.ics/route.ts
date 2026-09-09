import { NextResponse } from "next/server";
import { getCalendar } from "@/lib/data";
import type { Geo } from "@/lib/types";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** iCalendar feed of the economic calendar — subscribe in Outlook / Google / Apple Calendar. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const geo = q.get("geo") as Geo | null;
  const imp = q.get("imp");
  const { events } = await getCalendar();
  const rows = events.filter((e) => (!geo || e.geo === geo || e.geo === "GLOBAL") && (imp !== "high" || e.importance === "high"));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MacroBrief//Economic Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:MacroBrief — Economic Calendar",
    "X-WR-TIMEZONE:Europe/London",
  ];
  for (const e of rows) {
    const end = new Date(new Date(e.at).getTime() + 30 * 60_000).toISOString();
    const desc = [e.consensus && `Consensus: ${e.consensus}`, e.previous && `Previous: ${e.previous}`, e.actual && `Actual: ${e.actual}`, `Source: ${e.source} ${e.sourceUrl}`].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@macrobrief`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.at)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`[${e.geo}] ${e.title}${e.importance === "high" ? " ★" : ""}`)}`,
      `DESCRIPTION:${esc(desc)}`,
      `URL:${e.sourceUrl}`,
      `CATEGORIES:${e.geo},${e.importance}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="macrobrief-calendar${geo ? "-" + geo : ""}.ics"`,
    },
  });
}
