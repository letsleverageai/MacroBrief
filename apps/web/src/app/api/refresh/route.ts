import { NextResponse } from "next/server";

/**
 * Manual "re-update" trigger. In production this POSTs to the pipeline service
 * (PIPELINE_URL/run/dashboard.refresh) which re-pulls sources and writes to Postgres.
 * In the mock it simulates a run.
 */
export async function POST() {
  const url = process.env.PIPELINE_URL;
  if (url) {
    try {
      const r = await fetch(`${url}/run/dashboard.refresh`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.PIPELINE_TOKEN ?? ""}` },
      });
      return NextResponse.json(await r.json(), { status: r.status });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  return NextResponse.json({ ok: true, simulated: true, refreshedAt: new Date().toISOString(), updated: 3 });
}
