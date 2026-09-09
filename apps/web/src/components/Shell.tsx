"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Activity, BookOpenText, CalendarClock, CalendarDays, Database, Globe, Landmark, LogOut, Mail, NotebookPen, Settings, ShieldCheck } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

const NAV = [
  { href: "/brief", label: "Daily Brief", icon: BookOpenText, hint: "06:00 email, five sections" },
  { href: "/calendar", label: "Economic Calendar", icon: CalendarDays, hint: "Week view, filters, .ics export" },
  { href: "/eco", label: "Eco Dashboard", icon: Activity, hint: "Data by geography & category" },
  { href: "/decision-makers", label: "Decision Makers", icon: Landmark, hint: "Policy · Spending & Credit · Market" },
  { href: "/journal", label: "Journal", icon: NotebookPen, hint: "Your notes, calls and post-mortems" },
  { href: "/email/preview", label: "Email Preview", icon: Mail, hint: "What lands in the inbox" },
  { href: "/sources", label: "Sources", icon: Database, hint: "Registry & status" },
  { href: "/settings", label: "Settings & Runs", icon: Settings, hint: "Schedule, recipients, run log" },
  { href: "/setup/dns", label: "Setup: DNS & TLS", icon: Globe, hint: "Cloudflare in front of Hetzner" },
];

export type ShellStatus = "live" | "stale" | "preview";

const STATUS = {
  live: { dot: "bg-up", tag: "border-up/40 bg-up/10 text-up", label: "Live · pipeline connected" },
  stale: { dot: "bg-down", tag: "border-down/40 bg-down/10 text-down", label: "Pipeline unreachable · showing sample data" },
  preview: { dot: "bg-amber", tag: "border-amber/40 bg-amber/10 text-amber", label: "Preview · sample data" },
};

export function Shell({ children, generatedAt, timezone, nextEmailAt, status }: { children: React.ReactNode; generatedAt: string; timezone: string; nextEmailAt: string; status: ShellStatus }) {
  const path = usePathname();
  const st = STATUS[status];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel/60 backdrop-blur md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-accent text-bg font-black">M</div>
          <div>
            <div className="text-sm font-semibold tracking-tight">MacroBrief</div>
            <div className="text-[10px] uppercase tracking-widest text-fg-3">US · UK · CN</div>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon, hint }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-panel-2 text-fg" : "text-fg-2 hover:bg-panel-2/60 hover:text-fg",
                )}
              >
                <Icon className={clsx("h-4 w-4", active ? "text-accent" : "text-fg-3 group-hover:text-fg-2")} />
                <div className="min-w-0">
                  <div className="truncate">{label}</div>
                  <div className="truncate text-[10px] text-fg-3">{hint}</div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-line p-3 text-[11px] text-fg-3">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Next email {fmtDateTime(nextEmailAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-up" />
            <span>Session · 2FA · TLS</span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="flex items-center gap-1.5 text-fg-3 hover:text-fg">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-2 text-xs text-fg-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <span className={clsx("inline-block h-1.5 w-1.5 rounded-full", st.dot)} />
            <span>
              Data as of <span className="text-fg-2">{fmtDateTime(generatedAt)}</span> ({timezone})
            </span>
          </div>
          <span className={clsx("rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", st.tag)}>{st.label}</span>
        </div>
        <main className="px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
