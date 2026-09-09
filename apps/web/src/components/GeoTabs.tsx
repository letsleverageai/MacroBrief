"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { Geo } from "@/lib/types";
import { GEO_FLAG, GEO_LABEL } from "@/lib/format";

/** URL-driven geography filter (?geo=UK). Server components read the same param. */
export function GeoTabs({ options, param = "geo", allLabel = "All" }: { options: Geo[]; param?: string; allLabel?: string | null }) {
  const path = usePathname();
  const sp = useSearchParams();
  const current = sp.get(param);
  const make = (g: Geo | null) => {
    const q = new URLSearchParams(sp.toString());
    if (g) q.set(param, g);
    else q.delete(param);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  const Item = ({ g, label }: { g: Geo | null; label: string }) => (
    <Link
      href={make(g)}
      scroll={false}
      className={clsx(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        (g ?? null) === (current as Geo | null) || (g === null && !current)
          ? "bg-accent text-bg"
          : "text-fg-2 hover:bg-panel-2 hover:text-fg",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5">
      {allLabel !== null && <Item g={null} label={allLabel} />}
      {options.map((g) => (
        <Item key={g} g={g} label={`${GEO_FLAG[g]} ${GEO_LABEL[g]}`} />
      ))}
    </div>
  );
}
