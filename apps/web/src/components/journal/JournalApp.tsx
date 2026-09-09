"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Download, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { Geo } from "@/lib/types";
import { GEO_FLAG, GEO_LABEL } from "@/lib/format";
import { JOURNAL_TEMPLATES, type JournalEntry } from "@/data/journal";
import { Badge, Empty, GeoPill } from "@/components/ui";

const LS_KEY = "macrobrief.journal.v1";
const GEOS: Geo[] = ["US", "UK", "CN", "GLOBAL"];
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Minimal inline markdown: **bold**, `code`, bare URLs → links, line breaks. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-fg-2">
      {lines.map((ln, i) => {
        const parts = ln.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/\S+)/g).filter(Boolean);
        return (
          <p key={i} className={clsx(ln.trim() === "" && "h-2")}>
            {parts.map((p, j) => {
              if (p.startsWith("**") && p.endsWith("**")) return <b key={j} className="text-fg">{p.slice(2, -2)}</b>;
              if (p.startsWith("`") && p.endsWith("`")) return <code key={j} className="rounded bg-panel-2 px-1 text-[12px]">{p.slice(1, -1)}</code>;
              if (/^https?:\/\//.test(p)) return <a key={j} href={p} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{p.replace(/^https?:\/\//, "").slice(0, 60)}</a>;
              return <span key={j}>{p}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

type Draft = Omit<JournalEntry, "tags" | "links"> & { tags: string; links: string };
const toDraft = (e: JournalEntry): Draft => ({ ...e, tags: e.tags.join(", "), links: e.links.join("\n") });
const fromDraft = (d: Draft): JournalEntry => ({
  ...d,
  title: d.title.trim() || "(untitled)",
  tags: d.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
  links: d.links.split(/\s+/).map((l) => l.trim()).filter(Boolean),
  updatedAt: new Date().toISOString(),
});

export function JournalApp({ seed }: { seed: JournalEntry[] }) {
  const [storage, setStorage] = useState<"loading" | "pipeline" | "local">("loading");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [saving, setSaving] = useState(false);

  // Load: pipeline if connected, else localStorage (seeded on first visit)
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/journal").then((r) => r.json()).catch(() => ({ storage: "local", entries: [] }));
      if (r.storage === "pipeline") {
        setEntries(r.entries);
        setStorage("pipeline");
      } else {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
        const local: JournalEntry[] = raw ? JSON.parse(raw) : seed;
        if (!raw) window.localStorage.setItem(LS_KEY, JSON.stringify(seed));
        setEntries(local);
        setStorage("local");
      }
    })();
  }, [seed]);

  const persist = async (next: JournalEntry[], changed?: JournalEntry, removedId?: string) => {
    setEntries(next);
    if (storage === "local") {
      window.localStorage.setItem(LS_KEY, JSON.stringify(next));
      return;
    }
    setSaving(true);
    try {
      if (changed) await fetch("/api/journal", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(changed) });
      if (removedId) await fetch(`/api/journal?id=${encodeURIComponent(removedId)}`, { method: "DELETE" });
    } finally {
      setSaving(false);
    }
  };

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e) => e.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...entries]
      .filter((e) => (!tag || e.tags.includes(tag)) && (!geo || e.geo === geo))
      .filter((e) => !needle || `${e.title} ${e.body} ${e.tags.join(" ")}`.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  }, [entries, q, tag, geo]);

  const current = entries.find((e) => e.id === selected) ?? null;

  const startNew = (tpl?: (typeof JOURNAL_TEMPLATES)[number]) => {
    const now = new Date().toISOString();
    setDraft({ id: newId(), date: today(), geo: geo ?? "GLOBAL", title: tpl?.title ?? "", body: tpl?.body ?? "", tags: tpl?.tags.join(", ") ?? "", links: "", createdAt: now, updatedAt: now });
    setSelected(null);
  };
  const save = async () => {
    if (!draft) return;
    const e = fromDraft(draft);
    const next = entries.some((x) => x.id === e.id) ? entries.map((x) => (x.id === e.id ? e : x)) : [e, ...entries];
    await persist(next, e);
    setDraft(null);
    setSelected(e.id);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await persist(entries.filter((x) => x.id !== id), undefined, id);
    if (selected === id) setSelected(null);
    if (draft?.id === id) setDraft(null);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `macrobrief-journal-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      {/* List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-fg-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, tags…" className="w-full rounded-md border border-line bg-panel py-1.5 pl-8 pr-2 text-xs text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none" />
          </div>
          <button onClick={() => startNew()} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent-2"><Plus className="h-3.5 w-3.5" /> New</button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {GEOS.map((g) => (
            <button key={g} onClick={() => setGeo(geo === g ? null : g)} className={clsx("rounded-md border px-2 py-0.5 text-[11px]", geo === g ? "border-accent bg-accent/15 text-accent" : "border-line text-fg-3 hover:text-fg")}>{GEO_FLAG[g]} {g}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          {allTags.slice(0, 10).map(([t, n]) => (
            <button key={t} onClick={() => setTag(tag === t ? null : t)} className={clsx("rounded-md border px-2 py-0.5 text-[11px]", tag === t ? "border-accent bg-accent/15 text-accent" : "border-line text-fg-3 hover:text-fg")}>#{t} <span className="num opacity-60">{n}</span></button>
          ))}
        </div>
        <div className="max-h-[calc(100vh-300px)] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {storage === "loading" && <div className="p-3 text-xs text-fg-3">Loading…</div>}
          {storage !== "loading" && visible.length === 0 && <Empty text={entries.length ? "No entries match." : "No entries yet — start with a template on the right."} />}
          {visible.map((e) => (
            <button key={e.id} onClick={() => { setSelected(e.id); setDraft(null); }} className={clsx("block w-full rounded-md border px-3 py-2 text-left transition-colors", selected === e.id && !draft ? "border-accent/60 bg-panel-2" : "border-line bg-panel hover:bg-panel-2/60")}>
              <div className="flex items-center gap-2 text-[11px] text-fg-3">
                <span className="num">{new Date(e.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</span>
                <GeoPill geo={e.geo} />
                <span className="ml-auto truncate">{e.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
              </div>
              <div className="mt-0.5 truncate text-xs font-medium text-fg">{e.title}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-fg-3">{e.body.replace(/\*\*/g, "")}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] text-fg-3">
          <span className="flex items-center gap-1.5">
            {storage === "pipeline" ? <Badge tone="up">saved to database</Badge> : storage === "local" ? <Badge tone="amber">saved in this browser</Badge> : null}
            {saving && <span>saving…</span>}
          </span>
          <button onClick={exportJson} className="inline-flex items-center gap-1 hover:text-fg"><Download className="h-3 w-3" /> Export JSON</button>
        </div>
      </div>

      {/* Detail / editor */}
      <div className="rounded-lg border border-line bg-panel">
        {draft ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">{entries.some((x) => x.id === draft.id) ? "Edit entry" : "New entry"}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setDraft(null)} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-fg-2 hover:text-fg"><X className="h-3.5 w-3.5" /> Cancel</button>
                <button onClick={save} className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-bg hover:bg-accent-2"><Save className="h-3.5 w-3.5" /> Save</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[150px_150px_1fr]">
              <label className="text-[11px] text-fg-3">Date<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="num mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none" /></label>
              <label className="text-[11px] text-fg-3">Geography
                <select value={draft.geo} onChange={(e) => setDraft({ ...draft, geo: e.target.value as Geo })} className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none">
                  {GEOS.map((g) => <option key={g} value={g}>{GEO_FLAG[g]} {GEO_LABEL[g]}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-fg-3">Tags <span className="opacity-60">(comma-separated)</span><input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="call, cpi, fed" className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none" /></label>
            </div>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none" />
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={14} placeholder="Notes. **bold** and `code` supported; URLs become links." className="w-full resize-y rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] leading-relaxed text-fg focus:border-accent focus:outline-none" />
            <label className="block text-[11px] text-fg-3">Links <span className="opacity-60">(one per line — the release, the speech, the chart)</span>
              <textarea value={draft.links} onChange={(e) => setDraft({ ...draft, links: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-[11px] text-fg focus:border-accent focus:outline-none" />
            </label>
          </div>
        ) : current ? (
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] text-fg-3">
                  <span className="num">{new Date(current.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span>
                  <GeoPill geo={current.geo} showLabel />
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{current.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1">{current.tags.map((t) => <button key={t} onClick={() => setTag(t)} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-fg-3 hover:text-fg">#{t}</button>)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setDraft(toDraft(current))} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-fg-2 hover:text-fg"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => remove(current.id)} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-fg-3 hover:border-down/40 hover:text-down"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="mt-4"><Rich text={current.body} /></div>
            {current.links.length > 0 && (
              <div className="mt-5 border-t border-line pt-3">
                <div className="text-[10px] uppercase tracking-wider text-fg-3">Sources</div>
                <ul className="mt-1 space-y-0.5 text-xs">{current.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{l}</a></li>)}</ul>
              </div>
            )}
            <div className="mt-5 text-[10px] text-fg-3">Last edited {new Date(current.updatedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}</div>
          </div>
        ) : (
          <div className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">Start an entry</div>
            <p className="mt-1 text-sm text-fg-2">Pick a template or select an entry on the left. Templates force the discipline: state the call before the print, then grade it after.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {JOURNAL_TEMPLATES.map((t) => (
                <button key={t.label} onClick={() => startNew(t)} className="rounded-md border border-line bg-panel-2/40 p-3 text-left hover:border-line-2 hover:bg-panel-2">
                  <div className="text-xs font-semibold text-fg">{t.label}</div>
                  <div className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] text-fg-3">{t.body.replace(/\*\*/g, "")}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
