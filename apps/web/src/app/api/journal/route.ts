import { NextResponse } from "next/server";

/**
 * Journal storage proxy. With PIPELINE_URL the entries live in the pipeline's Postgres/SQLite
 * (journal_entries table); without it the client keeps them in localStorage and this returns storage:"local".
 */
export const dynamic = "force-dynamic";

const URL = process.env.PIPELINE_URL?.replace(/\/$/, "");
const headers = { authorization: `Bearer ${process.env.PIPELINE_TOKEN ?? ""}`, "content-type": "application/json" };

export async function GET() {
  if (!URL) return NextResponse.json({ storage: "local", entries: [] });
  try {
    const r = await fetch(`${URL}/journal.json`, { headers, cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as Array<Record<string, unknown>>;
    const entries = rows.map((r) => ({
      id: r.id, date: r.date, geo: r.geo, title: r.title, body: r.body, tags: r.tags ?? [], links: r.links ?? [],
      createdAt: r.created_at, updatedAt: r.updated_at,
    }));
    return NextResponse.json({ storage: "pipeline", entries });
  } catch (e) {
    return NextResponse.json({ storage: "local", entries: [], error: String(e) });
  }
}

export async function PUT(req: Request) {
  if (!URL) return NextResponse.json({ ok: false, error: "no pipeline" }, { status: 503 });
  const e = await req.json();
  const r = await fetch(`${URL}/journal/${encodeURIComponent(e.id)}`, {
    method: "PUT", headers,
    body: JSON.stringify({ date: e.date, geo: e.geo, title: e.title, body: e.body, tags: e.tags, links: e.links, created_at: e.createdAt }),
  });
  return NextResponse.json(await r.json(), { status: r.status });
}

export async function DELETE(req: Request) {
  if (!URL) return NextResponse.json({ ok: false, error: "no pipeline" }, { status: 503 });
  const id = new globalThis.URL(req.url).searchParams.get("id") ?? "";
  const r = await fetch(`${URL}/journal/${encodeURIComponent(id)}`, { method: "DELETE", headers });
  return NextResponse.json(await r.json(), { status: r.status });
}
