import { requireOwnerPage } from "@/lib/auth";
import { aiAvailable } from "@/lib/ai/claude";
import { monthStartISO } from "@/lib/reports";
import { env } from "@/lib/env";
import { PageHead } from "../PageHead";
import { AISettings } from "./AISettings";

export const metadata = { title: "AI settings" };
export default async function AIPage() {
  const { repo } = await requireOwnerPage();
  const [settings, usage, draft, pub] = await Promise.all([repo.getSettings(), repo.usageSince(monthStartISO()), repo.getDraft(), repo.getPublished()]);
  const by: Record<string, { requests: number; tokens: number; usd: number }> = {};
  for (const u of usage) { const k = u.feature; by[k] = by[k] || { requests: 0, tokens: 0, usd: 0 }; by[k].requests++; by[k].tokens += u.inputTokens + u.outputTokens; by[k].usd += u.costUsd; }
  return (<>
    <PageHead title="AI settings" intro="Which Claude models run each feature, the monthly budget, and the writing rules applied to every AI request." />
    <AISettings settings={settings} usage={by} connected={aiAvailable()} mock={env.aiMock} rules={(draft || pub).library.houseRules || []} />
  </>);
}
