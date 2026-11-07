"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/components/client/useApi";
import { toast } from "@/editor/ui.js";

export interface TplCard { id: string; abbr: string; name: string; cat: string; desc: string; docType: string; sections: string[]; theme: string; cover: string; font: string; layout: string; allowed: boolean; thumb: string }

export function LibraryClient({ cards, categories, themes, covers, draft, canCreate, limitNote }: { cards: TplCard[]; categories: string[]; themes: Array<{ id: string; name: string; bar: string }>; covers: Array<{ id: string; name: string; thumb: string }>; draft: boolean; canCreate: boolean; limitNote: string }) {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<TplCard | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const list = cat === "All" ? cards : cards.filter(c => c.cat === cat);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [open]);
  async function start(t: TplCard) {
    setBusy(true);
    try { const { id } = await api("/api/reports", { json: { templateId: t.id, draft } }); toast(`${t.name} ready. Paste your draft to begin.`); router.push(`/reports/${id}${draft ? "?lib=draft" : ""}`); }
    catch (e: any) { toast(e.message); setBusy(false); }
  }
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {["All", ...categories].map(c => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map(t => (
          <li key={t.id}>
            <button type="button" onClick={() => setOpen(t)} className="card group flex h-full w-full flex-col p-4 text-left transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-primary">
              <div className="mx-auto w-[62%] shadow-paper" dangerouslySetInnerHTML={{ __html: t.thumb }} />
              <span className="micro mt-4 text-secondary">{t.cat}</span>
              <span className="mt-1 font-serif text-title-md leading-snug group-hover:text-primary">{t.name}</span>
              <span className="mt-1 text-body-sm text-on-surface-variant">{t.desc}</span>
              <span className="mt-auto flex flex-wrap gap-x-3 pt-3 text-body-sm text-outline"><span>{t.sections.length} sections</span><span>{t.theme} · {t.cover}</span>{!t.allowed && <span className="badge bg-surface-container-high text-on-surface-variant">Upgrade</span>}</span>
            </button>
          </li>
        ))}
      </ul>
      <section className="mt-14" aria-labelledby="th"><h2 id="th" className="font-serif text-headline-sm">Colour themes</h2><p className="mt-1 text-body-sm text-on-surface-variant">Switch a report's theme at any time in the editor.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{themes.map(th => <div key={th.id} className="card p-2"><div className="theme-bar" dangerouslySetInnerHTML={{ __html: th.bar }} /><span className="mt-1 block text-body-sm font-semibold">{th.name}</span></div>)}</div></section>
      <section className="mt-10" aria-labelledby="cv"><h2 id="cv" className="font-serif text-headline-sm">Cover designs</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">{covers.map(c => <figure key={c.id} className="m-0"><div className="shadow-paper" dangerouslySetInnerHTML={{ __html: c.thumb }} /><figcaption className="mt-2 text-body-sm font-semibold">{c.name}</figcaption></figure>)}</div></section>

      {open && (
        <div className="rs-scrim" onClick={e => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="rs-modal wide" role="dialog" aria-modal="true" aria-labelledby="tpl-title">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[240px] shadow-paper" dangerouslySetInnerHTML={{ __html: open.thumb }} />
              <div className="min-w-0">
                <p className="micro text-secondary">{open.cat}</p>
                <h3 id="tpl-title" className="!mb-1 mt-1">{open.name}</h3>
                <p>{open.desc}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                  <dt className="text-on-surface-variant">Theme</dt><dd className="font-semibold">{open.theme}</dd>
                  <dt className="text-on-surface-variant">Cover</dt><dd className="font-semibold">{open.cover}</dd>
                  <dt className="text-on-surface-variant">Typefaces</dt><dd className="font-semibold">{open.font}</dd>
                  <dt className="text-on-surface-variant">Layout</dt><dd className="font-semibold">{open.layout}</dd>
                </dl>
                <p className="micro mt-5">Sections</p>
                <ol className="mt-2 list-decimal pl-5 text-body-sm sm:columns-2 sm:gap-8">{open.sections.map(x => <li key={x} className="break-inside-avoid py-0.5">{x}</li>)}</ol>
                <div className="rs-actions mt-6">
                  <button type="button" className="btn" onClick={() => setOpen(null)}>Close</button>
                  {open.allowed && canCreate ? <button type="button" className="btn btn-primary" disabled={busy} onClick={() => start(open)}>{busy ? "Starting…" : "Start a report with this"}</button>
                    : <Link href="/account#billing" className="btn btn-primary">{open.allowed ? "Upgrade for more reports" : "Upgrade to use this template"}</Link>}
                </div>
                {!canCreate && <p className="!mb-0 mt-3 text-right text-body-sm">{limitNote}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
