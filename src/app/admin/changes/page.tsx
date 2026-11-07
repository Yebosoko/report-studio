import { makeLib } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { requireOwnerPage } from "@/lib/auth";
import { libraryDiff } from "@/lib/lab/check";
import { PageHead } from "../PageHead";
import { ChangesClient } from "./ChangesClient";

export const metadata = { title: "Changes & versions" };
function card(lib: any, kind: string, id: string) {
  if (!lib) return null; const L = makeLib(lib);
  const has = (k: string) => (lib[k] || []).some((x: any) => x.id === id);
  if (kind === "template" && has("templates")) { const t = L.tpl(id); return { html: RD.thumb(L, t), lines: [`${t.sections.length} sections`, `${L.theme(t.theme).name} · ${L.cover(t.cover).name} · ${L.font(t.font).name}`, t.desc || ""] }; }
  if (kind === "theme" && has("themes")) { const th = L.theme(id); return { html: RD.thumb(L, lib.templates[0], { theme: id, title: th.name }), lines: [`#${th.primary} · #${th.secondary} · #${th.accent}`] }; }
  if (kind === "cover" && has("covers")) { const c = L.cover(id); return { html: RD.thumb(L, lib.templates[0], { cover: id, title: c.name }), lines: [`${c.rows.length} rows`] }; }
  if (kind === "font" && has("fonts")) { const f = L.font(id); return { html: "", lines: [`Word: ${f.head} / ${f.body}`] }; }
  if (kind === "rules") return { html: "", lines: (lib.houseRules || []) };
  if (kind === "categories") return { html: "", lines: (lib.categories || []) };
  return null;
}
export default async function Changes() {
  const { repo, profile } = await requireOwnerPage();
  const [pub, draft, cs, versions, sets] = await Promise.all([repo.getPublished(), repo.getDraft(), repo.getPendingChangeSet(), repo.listVersions(60), repo.listChangeSets(60)]);
  const diff = draft ? libraryDiff(pub.library, draft.library) : [];
  const items = diff.map(d => ({ ...d, before: card(pub.library, d.kind, d.id), after: card(draft?.library, d.kind, d.id) }));
  const hist = versions.filter(v => v.status !== "draft").map(v => ({ id: v.id, versionNo: v.versionNo, note: v.note, kind: v.kind, createdBy: v.createdBy, publishedAt: v.publishedAt || v.createdAt, current: v.status === "published", applied: sets.find(c => c.libraryVersionId === v.id && c.status === "applied")?.summary || "" }));
  return (<>
    <PageHead title="Changes & versions" intro="Review what's waiting, publish it, and go back to any earlier version." />
    <ChangesClient pending={cs ? { summary: cs.summary, steps: cs.steps, checks: cs.checks, createdAt: cs.createdAt } : null} hasDraft={!!draft} items={items} history={hist} ownerName={profile.name || profile.email} />
  </>);
}
