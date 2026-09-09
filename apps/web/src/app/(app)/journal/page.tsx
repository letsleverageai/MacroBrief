import { sampleJournal } from "@/data/journal";
import { pipelineConfigured } from "@/lib/data";
import { Badge } from "@/components/ui";
import { JournalApp } from "@/components/journal/JournalApp";

export const dynamic = "force-dynamic";

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="fade-up">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Journal {pipelineConfigured ? <Badge tone="up">database-backed</Badge> : <Badge tone="amber">browser storage · preview</Badge>}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Calls, post-mortems and reading notes</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          A dated log tied to the same geographies and tags as the rest of the dashboard. Write the call before the release, grade it after, and search it when the same set-up comes round again.
          Entries are stored in the pipeline database (Postgres) in production; in preview they live in this browser.
        </p>
      </header>
      <JournalApp seed={pipelineConfigured ? [] : sampleJournal} />
    </div>
  );
}
