import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ ok: true, service: "macrobrief-web", ts: new Date().toISOString() });
}
