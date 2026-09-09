import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { DecisionMaker, KPI } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Badge, Card, FlagDot, GeoPill, SourceLink } from "@/components/ui";

export function KpiTile({ k, compact }: { k: KPI; compact?: boolean }) {
  const Icon = k.deltaTone === "up" ? ArrowUpRight : k.deltaTone === "down" ? ArrowDownRight : Minus;
  const body = (
    <>
      <div className="truncate text-[10px] uppercase tracking-wider text-fg-3">{k.label}</div>
      <div className={clsx("num mt-0.5 font-semibold text-fg", compact ? "text-sm" : "text-base")}>{k.value}</div>
      {k.delta && (
        <div className={clsx("mt-0.5 flex items-center gap-1 text-[11px]", k.deltaTone === "up" && "text-up", k.deltaTone === "down" && "text-down", (!k.deltaTone || k.deltaTone === "flat") && "text-fg-3")}>
          <Icon className="h-3 w-3" /> {k.delta}
        </div>
      )}
    </>
  );
  return k.sourceUrl ? (
    <a href={k.sourceUrl} target="_blank" rel="noopener noreferrer" className="block rounded-md bg-panel-2/60 px-3 py-2 hover:bg-panel-2">{body}</a>
  ) : (
    <div className="rounded-md bg-panel-2/60 px-3 py-2">{body}</div>
  );
}

export function DecisionMakerCard({ d }: { d: DecisionMaker }) {
  const red = d.flags.filter((f) => f.level === "red").length;
  const amber = d.flags.filter((f) => f.level === "amber").length;
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GeoPill geo={d.geo} />
            <Link href={`/decision-makers/${d.slug}`} className="text-base font-semibold tracking-tight text-fg hover:text-accent">{d.name}</Link>
          </div>
          <div className="mt-0.5 text-xs text-fg-3">{d.subtitle}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {red > 0 && <Badge tone="down">{red} red</Badge>}
          {amber > 0 && <Badge tone="amber">{amber} amber</Badge>}
          {red + amber === 0 && <Badge tone="up">clear</Badge>}
        </div>
      </div>

      <p className="mt-3 px-4 text-xs leading-relaxed text-fg-2">{d.remit}</p>

      <div className="mt-3 px-4">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-3">What matters to them now</div>
        <div className="flex flex-wrap gap-1">{d.focus.map((f) => <Badge key={f} tone="accent">{f}</Badge>)}</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 px-4 md:grid-cols-3">
        {d.kpis.slice(0, 6).map((k) => <KpiTile key={k.label} k={k} compact />)}
      </div>

      <div className="mt-3 space-y-1.5 px-4">
        {d.flags.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-fg-2">
            <FlagDot level={f.level} /> <span>{f.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-line">
        <div className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-3">Latest to read</div>
        <ul className="divide-y divide-line/60">
          {d.watchlist.slice(0, 3).map((w) => (
            <li key={w.title} className="flex items-start gap-2 px-4 py-2">
              <FlagDot level={w.severity} />
              <div className="min-w-0 flex-1">
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="block text-xs font-medium text-fg hover:text-accent">{w.title}</a>
                <div className="text-[11px] text-fg-3">{fmtDate(w.date, { day: "2-digit", month: "short" })} · {w.summary}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {d.sources.slice(0, 3).map((s) => <SourceLink key={s.url} href={s.url}>{s.name}</SourceLink>)}
        </div>
        <Link href={`/decision-makers/${d.slug}`} className="text-[11px] font-medium text-accent hover:underline">Open →</Link>
      </div>
    </Card>
  );
}
