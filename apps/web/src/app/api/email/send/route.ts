import { NextResponse } from "next/server";

/**
 * "Send test email now": runs the pipeline's daily_brief.email job (scans → summaries → render → send).
 * Without PIPELINE_URL this is a no-op that explains why.
 */
export const maxDuration = 300;

export async function POST() {
  const url = process.env.PIPELINE_URL;
  if (!url) {
    return NextResponse.json({ ok: false, detail: "Pipeline not connected (set PIPELINE_URL). Preview only." }, { status: 503 });
  }
  try {
    const r = await fetch(`${url}/run/daily_brief.email`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.PIPELINE_TOKEN ?? ""}` },
      signal: AbortSignal.timeout(290_000),
    });
    const j = await r.json();
    const first = String(j.detail ?? "").split("\n")[0];
    return NextResponse.json({ ok: j.status !== "fail", status: j.status, detail: first }, { status: r.ok ? 200 : r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, detail: String(e) }, { status: 502 });
  }
}
