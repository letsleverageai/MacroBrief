import { Shell } from "@/components/Shell";
import { getBrief, pipelineConfigured, pipelineHealth } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [b, health] = await Promise.all([getBrief(), pipelineHealth()]);
  const nextEmail = health?.jobs?.find((j) => j.id === "email")?.next;
  return (
    <Shell
      generatedAt={b.meta.generatedAt}
      timezone={b.meta.timezone}
      nextEmailAt={nextEmail ? new Date(nextEmail).toISOString() : b.meta.nextEmailAt}
      status={b.live.any ? "live" : pipelineConfigured ? "stale" : "preview"}
    >
      {children}
    </Shell>
  );
}
