import { Mail } from "lucide-react";
import { getBrief } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { Badge } from "@/components/ui";
import { SendTestEmail } from "@/components/SendTestEmail";

export const dynamic = "force-dynamic";

export default async function EmailPreviewPage() {
  const { meta, live } = await getBrief();
  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <header className="fade-up flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Email Preview {live.any ? <Badge tone="up">live scan</Badge> : <Badge tone="amber">sample data</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">What lands in the inbox at 06:00</h1>
          <p className="mt-1 text-sm text-fg-2">
            Table-based, inline-styled HTML (Outlook/Gmail safe). Same data as the Daily Brief; every line links out. Last generated {fmtDateTime(meta.generatedAt)} · recipients {meta.recipients.join(", ")}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/email" target="_blank" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg"><Mail className="h-3.5 w-3.5" /> Open raw HTML</a>
          <SendTestEmail />
        </div>
      </header>
      <div className="overflow-hidden rounded-lg border border-line bg-[#f5f6f8]">
        <iframe src="/api/email" title="Daily brief email" className="h-[calc(100vh-220px)] w-full" />
      </div>
    </div>
  );
}
