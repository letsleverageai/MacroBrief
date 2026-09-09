import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Mail } from "lucide-react";
import type { Geo } from "@/lib/types";
import { fmtDateLong, fmtDateTime } from "@/lib/format";
import { getBrief } from "@/lib/data";
import { GeoTabs } from "@/components/GeoTabs";
import { Badge, SectionTitle } from "@/components/ui";
import { DecisionMakerSummary, EcoCalendar, EcoSummary, GlobalSummary, MarketSummary } from "@/components/brief/BriefSections";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "markets", n: "01", title: "Market Summary", blurb: "Key equities, rates, FX and commodities — close, 1D, 5D, MTD, YTD and 52-week range." },
  { id: "calendar", n: "02", title: "Economic Calendar", blurb: "Scraped from Forex Factory / official release calendars. Split by geography; high & medium importance only." },
  { id: "eco", n: "03", title: "Economic Summary", blurb: "The pipeline reads each key release, links the report and writes one line on the outcome and one on consensus." },
  { id: "dm", n: "04", title: "Decision Maker Summary", blurb: "Central banks, government, treasury and regulators — latest research, speeches and reports." },
  { id: "global", n: "05", title: "Global Summary", blurb: "Headlines ranked by source tier: Bloomberg/Economist › FT/WSJ › Reuters/other. Title-only where we have no login." },
];

const ALL: Geo[] = ["US", "UK", "CN"];

function LiveTag({ live }: { live: boolean }) {
  return live ? <Badge tone="up">live scan</Badge> : <Badge tone="neutral">sample data</Badge>;
}

export default async function BriefPage({ searchParams }: { searchParams: Promise<{ geo?: string }> }) {
  const [{ geo }, b] = await Promise.all([searchParams, getBrief()]);
  const sel = ALL.includes(geo as Geo) ? [geo as Geo] : ALL;
  const inSel = <T extends { geo: Geo }>(x: T) => sel.includes(x.geo) || x.geo === "GLOBAL";
  const { meta } = b;

  return (
    <div className="mx-auto max-w-[1500px] space-y-10">
      <header className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Daily Brief
            {b.live.any ? <Badge tone="up">live · pipeline connected</Badge> : <Badge tone="amber">preview · sample data</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{fmtDateLong(meta.asOf + "T06:00:00Z")}</h1>
          <p className="mt-1 text-sm text-fg-2">
            Generated {fmtDateTime(meta.generatedAt)} · emailed to {meta.recipients.join(", ")} · LLM cost today ${meta.costTodayUsd.toFixed(2)}
          </p>
          {b.oneLiner && <p className="mt-2 max-w-3xl text-sm text-fg">{b.oneLiner}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense><GeoTabs options={ALL} allLabel="US · UK · CN" /></Suspense>
          <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg">
            <CalendarDays className="h-3.5 w-3.5" /> Full calendar
          </Link>
          <Link href="/email/preview" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg">
            <Mail className="h-3.5 w-3.5" /> Email version
          </Link>
        </div>
      </header>

      <nav className="sticky top-[37px] z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-bg/90 px-4 py-2 backdrop-blur md:-mx-6 md:px-6 scrollbar-thin">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-fg-2 hover:bg-panel-2 hover:text-fg">
            <span className="num mr-1.5 text-accent">{s.n}</span>{s.title}
          </a>
        ))}
      </nav>

      <section id="markets" className="scroll-mt-24">
        <SectionTitle n="01" title={SECTIONS[0].title} blurb={SECTIONS[0].blurb} right={<LiveTag live={b.live.markets} />} />
        <MarketSummary rows={b.markets.filter(inSel)} />
      </section>

      <section id="calendar" className="scroll-mt-24">
        <SectionTitle n="02" title={SECTIONS[1].title} blurb={SECTIONS[1].blurb} right={<LiveTag live={b.live.calendar} />} />
        <EcoCalendar events={b.calendar.filter(inSel)} geos={sel} />
      </section>

      <section id="eco" className="scroll-mt-24">
        <SectionTitle n="03" title={SECTIONS[2].title} blurb={SECTIONS[2].blurb} right={<LiveTag live={b.live.releases} />} />
        <EcoSummary releases={b.releases.filter(inSel)} />
      </section>

      <section id="dm" className="scroll-mt-24">
        <SectionTitle n="04" title={SECTIONS[3].title} blurb={SECTIONS[3].blurb} right={<LiveTag live={b.live.decisionMakers} />} />
        <DecisionMakerSummary items={b.decisionMakers.filter(inSel)} />
      </section>

      <section id="global" className="scroll-mt-24">
        <SectionTitle n="05" title={SECTIONS[4].title} blurb={SECTIONS[4].blurb} right={<LiveTag live={b.live.headlines} />} />
        <GlobalSummary items={b.headlines.filter(inSel)} />
      </section>
    </div>
  );
}
