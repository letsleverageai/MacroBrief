import { NextResponse } from "next/server";
import { getBrief } from "@/lib/data";
import { renderDailyBriefEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Raw HTML of today's email, rendered from the latest scan (fixtures when the pipeline is not connected). */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const b = await getBrief();
  const html = renderDailyBriefEmail({
    asOf: b.meta.asOf,
    generatedAt: b.meta.generatedAt,
    dashboardUrl: origin,
    markets: b.markets,
    calendar: b.calendar,
    releases: b.releases,
    decisionMakers: b.decisionMakers,
    headlines: b.headlines,
    oneLiner: b.oneLiner,
    live: b.live.any,
  });
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
