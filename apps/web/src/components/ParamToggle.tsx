"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";

/** Generic URL-param segmented control: options [{value,label}], value "" = param removed. */
export function ParamToggle({ param, options }: { param: string; options: { value: string; label: React.ReactNode }[] }) {
  const path = usePathname();
  const sp = useSearchParams();
  const current = sp.get(param) ?? "";
  const make = (v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(param, v);
    else q.delete(param);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5">
      {options.map((o) => (
        <Link key={o.value} href={make(o.value)} scroll={false} className={clsx("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", current === o.value ? "bg-accent text-bg" : "text-fg-2 hover:bg-panel-2 hover:text-fg")}>
          {o.label}
        </Link>
      ))}
    </div>
  );
}
