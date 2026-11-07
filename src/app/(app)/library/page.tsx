import type { Metadata } from "next";
import Link from "next/link";
import { makeLib, STYLE_LABELS, STYLE_OPTIONS } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { isOwner, pendingCount, requireUser } from "@/lib/auth";
import { allowedTemplateIds, planUsage } from "@/lib/reports";
import { AppHeader } from "@/components/AppHeader";
import { LibraryClient, type TplCard } from "./LibraryClient";

export const metadata: Metadata = { title: "Template library" };
export const dynamic = "force-dynamic";

export default async function Library({ searchParams }: { searchParams: Promise<{ pick?: string; lib?: string }> }) {
  const s = await requireUser("/library");
  const sp = await searchParams;
  const owner = isOwner(s.profile);
  const draft = owner ? await s.repo.getDraft() : null;
  const useDraft = owner && sp.lib === "draft" && !!draft;
  const library = useDraft ? draft!.library : (await s.repo.getPublished()).library;
  const [usage, pending] = await Promise.all([planUsage(s.repo, s.profile), pendingCount(s)]);
  const allowed = allowedTemplateIds(library, usage.templateLimit);
  const L = makeLib(library);
  const label = (k: string, v: string) => (STYLE_OPTIONS as any)[k].find((o: any) => o[0] === v)?.[1] || v;
  const cards: TplCard[] = library.templates.map((t: any) => {
    const st = L.styleOf(t);
    return { id: t.id, abbr: t.abbr, name: t.name, cat: t.cat, desc: t.desc || "", docType: t.docType, sections: t.sections.map((x: any) => x.title),
      theme: L.theme(t.theme).name, cover: L.cover(t.cover).name, font: L.font(t.font).name, allowed: allowed.has(t.id),
      layout: Object.keys(STYLE_OPTIONS).map(k => `${(STYLE_LABELS as any)[k]}: ${label(k, st[k])}`).join(" · "),
      thumb: RD.thumb(L, t) };
  });
  const themes = library.themes.map((th: any) => ({ id: th.id, name: th.name, bar: RD.themeBar(th) }));
  const covers = library.covers.map((c: any) => ({ id: c.id, name: c.name, thumb: RD.thumb(L, library.templates[0], { cover: c.id, title: c.name }) }));
  return (
    <>
      <AppHeader profile={s.profile} active="library" pending={pending} />
      {owner && draft && (
        <div className="border-b border-secondary/30 bg-secondary-fixed/50"><div className="gutter mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 py-2 text-body-sm">
          <span>{useDraft ? "You're previewing the draft library with pending Studio Lab changes. Members still see the published version." : "There's a draft library with pending changes."}</span>
          <Link className="font-semibold text-primary hover:underline" href={useDraft ? "/library" : "/library?lib=draft"}>{useDraft ? "Back to the published library" : "Preview the draft"}</Link>
        </div></div>
      )}
      <main className="gutter mx-auto max-w-7xl py-8">
        <p className="micro">Library</p>
        <h1 className="mt-1 max-w-3xl font-serif text-headline-lg" style={{ textWrap: "balance" } as any}>Formats for safeguards, development and business documents</h1>
        {sp.pick && <p className="mt-2 text-body-md text-on-surface-variant">Choose a template to start a new report.</p>}
        <LibraryClient cards={cards} categories={library.categories} themes={themes} covers={covers} draft={useDraft} canCreate={usage.canCreate} limitNote={usage.canCreate ? "" : `You've used this month's ${usage.limit} reports on the ${usage.plan?.name} plan.`} />
      </main>
    </>
  );
}
