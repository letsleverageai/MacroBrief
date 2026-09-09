import { Suspense } from "react";
import Link from "next/link";
import clsx from "clsx";
import { decisionMakers } from "@/data/decisionMakers";
import { PILLAR_META, type Geo, type Pillar } from "@/lib/types";
import { GeoTabs } from "@/components/GeoTabs";
import { SectionTitle } from "@/components/ui";
import { DecisionMakerCard } from "@/components/dm/DecisionMakerCard";

const PILLARS: Pillar[] = ["policy", "spending_credit", "market"];
const GEOS: Geo[] = ["UK", "US", "CN"];

export default async function DecisionMakersPage({ searchParams }: { searchParams: Promise<{ geo?: string; pillar?: string }> }) {
  const { geo, pillar } = await searchParams;
  const g = GEOS.includes(geo as Geo) ? (geo as Geo) : null;
  const p = PILLARS.includes(pillar as Pillar) ? (pillar as Pillar) : null;
  const list = decisionMakers.filter((d) => (!g || d.geo === g || d.geo === "GLOBAL") && (!p || d.pillar === p));

  return (
    <div className="mx-auto max-w-[1500px] space-y-8">
      <header className="fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Decision Makers</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Who decides, what they care about, what they just said</h1>
          <p className="mt-1 text-sm text-fg-2">Organised by decision maker rather than by economic factor. Each card&apos;s remit, focus list and KPIs are editable config — rotate what you track as the regime changes.</p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Suspense><GeoTabs options={GEOS} allLabel="All" /></Suspense>
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5">
            <Link href={g ? `/decision-makers?geo=${g}` : "/decision-makers"} className={clsx("rounded-md px-2.5 py-1 text-xs font-medium", !p ? "bg-accent text-bg" : "text-fg-2 hover:bg-panel-2 hover:text-fg")}>All pillars</Link>
            {PILLARS.map((pp) => (
              <Link key={pp} href={`/decision-makers?${g ? `geo=${g}&` : ""}pillar=${pp}`} className={clsx("rounded-md px-2.5 py-1 text-xs font-medium", p === pp ? "bg-accent text-bg" : "text-fg-2 hover:bg-panel-2 hover:text-fg")}>{PILLAR_META[pp].label}</Link>
            ))}
          </div>
        </div>
      </header>

      {PILLARS.filter((pp) => !p || pp === p).map((pp, i) => {
        const items = list.filter((d) => d.pillar === pp);
        if (!items.length) return null;
        return (
          <section key={pp} id={pp} className="scroll-mt-24">
            <SectionTitle n={`0${i + 1}`} title={PILLAR_META[pp].label} blurb={PILLAR_META[pp].blurb} />
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((d) => <DecisionMakerCard key={d.slug} d={d} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
