import { makeLib } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { requireOwnerPage } from "@/lib/auth";
import { aiAvailable } from "@/lib/ai/claude";
import { libraryDiff } from "@/lib/lab/check";
import { PageHead } from "../PageHead";
import { LabClient } from "./LabClient";

export const metadata = { title: "Studio Lab" };
export default async function Lab({ searchParams }: { searchParams: Promise<{ sample?: string; ask?: string }> }) {
  const { repo } = await requireOwnerPage();
  const sp = await searchParams;
  const [thread, samples, cs, draft, pub, settings] = await Promise.all([repo.getThread(), repo.listSamples(), repo.getPendingChangeSet(), repo.getDraft(), repo.getPublished(), repo.getSettings()]);
  const diff = draft ? libraryDiff(pub.library, draft.library) : [];
  let preview: { html: string; label: string; templateId?: string } | null = null;
  if (draft && diff.length) {
    const L = makeLib(draft.library);
    const t = diff.find(d => d.kind === "template" && d.change !== "removed");
    const th = diff.find(d => d.kind === "theme" && d.change !== "removed"); const cv = diff.find(d => d.kind === "cover" && d.change !== "removed");
    const tpl = t ? L.tpl(t.id) : draft.library.templates[0];
    preview = { html: RD.thumb(L, tpl, { theme: th?.id, cover: cv?.id }), label: t ? `Template ${t.name}` : th ? `Theme ${th.name}` : cv ? `Cover ${cv.name}` : tpl.name, templateId: tpl.id };
  }
  return (<>
    <PageHead title="Studio Lab" intro="Ask Claude for new templates, themes, covers or writing rules. Changes go to a draft and wait for your approval." />
    <LabClient initialThread={thread} samples={samples.map(s => ({ id: s.id, name: s.name, studied: !!s.study }))} pending={cs ? { summary: cs.summary, checks: cs.checks } : null} diff={diff}
      preview={preview} model={settings.labModel} connected={aiAvailable()} initialSample={sp.sample || ""} initialAsk={sp.ask || ""} />
  </>);
}
