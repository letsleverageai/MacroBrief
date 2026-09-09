"use client";

import { useState } from "react";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { EcoSeries } from "@/lib/types";
import { fmtPeriod, signed } from "@/lib/format";
import { SourceLink, Sparkline } from "@/components/ui";

function deltaTone(s: EcoSeries): "up" | "down" | "flat" {
  const d = s.latest.value - s.previous.value;
  if (Math.abs(d) < 1e-9) return "flat";
  // For "hot" series (inflation, wages) a rise is red; for activity a rise is green.
  const goodUp = !s.higherIsHot;
  return d > 0 ? (goodUp ? "up" : "down") : goodUp ? "down" : "up";
}

function Chart({ s }: { s: EcoSeries }) {
  const data = s.history.map((p) => ({ ...p, label: fmtPeriod(p.period) }));
  const isRate = /% m\/m|% q\/q|k m\/m|£bn|\$bn|CNY tn|count|k$/.test(s.unit) && !/% y\/y|^%$|index|% GDP|\$tn|mn/.test(s.unit);
  const common = {
    data,
    margin: { top: 8, right: 8, bottom: 0, left: -12 },
  };
  const tooltip = (
    <Tooltip
      contentStyle={{ background: "#171c26", border: "1px solid #2e3746", borderRadius: 6, fontSize: 11 }}
      labelStyle={{ color: "#a3acbd" }}
      formatter={(v) => [`${v} ${s.unit}`, s.name]}
    />
  );
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        {isRate ? (
          <BarChart {...common}>
            <CartesianGrid stroke="#232a37" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7588" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#6b7588" }} tickLine={false} axisLine={false} width={48} />
            {tooltip}
            <ReferenceLine y={0} stroke="#2e3746" />
            <Bar dataKey="value" fill="#f5b942" radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart {...common}>
            <CartesianGrid stroke="#232a37" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7588" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#6b7588" }} tickLine={false} axisLine={false} width={48} domain={["auto", "auto"]} />
            {tooltip}
            {s.consensus !== undefined && <ReferenceLine y={s.consensus} stroke="#5aa9ff" strokeDasharray="4 4" label={{ value: "cons", fill: "#5aa9ff", fontSize: 10, position: "right" }} />}
            <Line type="monotone" dataKey="value" stroke="#f5b942" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function SeriesExplorer({ series, defaultOpen }: { series: EcoSeries[]; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-fg-3">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-right [&>th:first-child]:text-left [&>th:nth-child(2)]:text-left">
            <th></th><th>Series</th><th>Latest</th><th>Prev</th><th>Δ</th><th>Cons</th><th className="!text-center">12m</th><th>Next</th><th></th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => {
            const isOpen = open === s.id;
            const tone = deltaTone(s);
            const d = s.latest.value - s.previous.value;
            const dp = Math.abs(s.latest.value) >= 100 ? 0 : 1;
            return (
              <FragmentRow key={s.id}>
                <tr
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className={clsx("cursor-pointer border-t border-line/70 hover:bg-panel-2/50 [&>td]:px-3 [&>td]:py-1.5 [&>td]:text-right [&>td:first-child]:text-left [&>td:nth-child(2)]:text-left", isOpen && "bg-panel-2/40")}
                >
                  <td className="w-4 text-fg-3">{isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</td>
                  <td>
                    <div className="font-medium text-fg">{s.name}</div>
                    <div className="text-[10px] text-fg-3">{s.unit} · {s.sourceName}{s.note ? ` · ${s.note}` : ""}</div>
                  </td>
                  <td className="num">
                    <div className="font-semibold text-fg">{s.latest.value.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</div>
                    <div className="text-[10px] text-fg-3">{fmtPeriod(s.latest.period)}</div>
                  </td>
                  <td className="num text-fg-2">{s.previous.value.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</td>
                  <td className={clsx("num", tone === "up" && "text-up", tone === "down" && "text-down", tone === "flat" && "text-fg-3")}>{signed(d, dp)}</td>
                  <td className="num text-fg-3">{s.consensus !== undefined ? s.consensus : "—"}</td>
                  <td><div className="flex justify-center"><Sparkline data={s.history.map((p) => p.value)} tone={s.higherIsHot ? (d <= 0 ? "up" : "down") : undefined} /></div></td>
                  <td className="num text-[10px] text-fg-3">{s.nextRelease ? new Date(s.nextRelease).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}><SourceLink href={s.sourceUrl} /></td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-line/40 bg-panel-2/30">
                    <td colSpan={9} className="px-3 pb-3 pt-1">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-fg-3">
                        <span>{s.name} — last {s.history.length} {s.frequency === "Q" ? "quarters" : s.frequency === "W" ? "weeks" : "months"}</span>
                        <span>Backing document: <SourceLink href={s.sourceUrl}>{s.sourceName}</SourceLink></span>
                      </div>
                      <Chart s={s} />
                    </td>
                  </tr>
                )}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
