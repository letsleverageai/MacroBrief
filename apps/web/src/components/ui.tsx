import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import type { FlagLevel, Geo, Importance, Surprise } from "@/lib/types";
import { GEO_FLAG } from "@/lib/format";

export function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={clsx("rounded-lg border border-line bg-panel shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset]", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, sub, right, className }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-start justify-between gap-4 border-b border-line px-4 py-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold tracking-wide text-fg uppercase">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-fg-3">{sub}</p>}
      </div>
      {right && <div className="shrink-0 text-xs text-fg-3">{right}</div>}
    </div>
  );
}

export function SectionTitle({ n, title, blurb, right }: { n?: string; title: string; blurb?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          {n && <span className="num rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent">{n}</span>}
          <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
        </div>
        {blurb && <p className="mt-0.5 text-sm text-fg-2">{blurb}</p>}
      </div>
      {right}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "up" | "down" | "amber" | "info" | "accent"; className?: string }) {
  const tones = {
    neutral: "bg-panel-2 text-fg-2 border-line-2",
    up: "bg-up/10 text-up border-up/30",
    down: "bg-down/10 text-down border-down/30",
    amber: "bg-amber/10 text-amber border-amber/30",
    info: "bg-info/10 text-info border-info/30",
    accent: "bg-accent/10 text-accent border-accent/30",
  };
  return <span className={clsx("inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none", tones[tone], className)}>{children}</span>;
}

export function GeoPill({ geo, showLabel = false }: { geo: Geo; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-panel-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-2">
      <span aria-hidden>{GEO_FLAG[geo]}</span>
      {geo}
      {showLabel && <span className="text-fg-3">·</span>}
    </span>
  );
}

export function ImportanceDot({ level }: { level: Importance }) {
  return (
    <span
      title={level === "high" ? "High impact" : "Medium impact"}
      className={clsx("inline-block h-2 w-2 rounded-full", level === "high" ? "bg-down" : "bg-amber")}
    />
  );
}

export function SurpriseBadge({ s }: { s: Surprise }) {
  if (s === "beat") return <Badge tone="up">BEAT</Badge>;
  if (s === "miss") return <Badge tone="down">MISS</Badge>;
  if (s === "inline") return <Badge>IN LINE</Badge>;
  return <Badge>—</Badge>;
}

export function FlagDot({ level, className }: { level: FlagLevel; className?: string }) {
  return (
    <span
      className={clsx(
        "mt-1 inline-block h-2 w-2 shrink-0 rounded-full",
        level === "red" && "bg-down shadow-[0_0_8px_rgba(239,90,111,0.6)]",
        level === "amber" && "bg-amber",
        level === "green" && "bg-up",
        className,
      )}
    />
  );
}

export function Delta({ v, suffix = "%", dp = 2, invert = false, className }: { v: number; suffix?: string; dp?: number; invert?: boolean; className?: string }) {
  const positive = invert ? v < 0 : v > 0;
  const negative = invert ? v > 0 : v < 0;
  return (
    <span className={clsx("num", positive && "text-up", negative && "text-down", !positive && !negative && "text-fg-3", className)}>
      {v > 0 ? "+" : ""}
      {v.toFixed(dp)}
      {suffix}
    </span>
  );
}

export function SourceLink({ href, children, className }: { href: string; children?: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx("inline-flex items-center gap-1 text-[11px] text-fg-3 hover:text-accent transition-colors", className)}
    >
      {children ?? "Source"}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function Sparkline({ data, w = 84, h = 22, tone }: { data: number[]; w?: number; h?: number; tone?: "up" | "down" | "neutral" }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * (w - 2) + 1).toFixed(1)},${(h - 1 - ((v - min) / range) * (h - 2)).toFixed(1)}`);
  const t = tone ?? (data[data.length - 1] >= data[0] ? "up" : "down");
  const color = t === "up" ? "var(--color-up)" : t === "down" ? "var(--color-down)" : "var(--color-fg-3)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" points={pts.join(" ")} />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="1.8" fill={color} />
    </svg>
  );
}

export function Range52({ lo, hi, v }: { lo: number; hi: number; v: number }) {
  const pct = Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100));
  return (
    <div className="relative h-1.5 w-20 rounded-full bg-line-2" title={`52w: ${lo} – ${hi}`}>
      <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-accent" style={{ left: `calc(${pct}% - 1px)` }} />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-fg-3">{text}</div>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-2">{children}</kbd>;
}
