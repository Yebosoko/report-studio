"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client/useApi";
import { confirmBox, toast } from "@/editor/ui.js";
import { ChecksList } from "./ChangeBits";

type Card = { html: string; lines: string[] } | null;
export function ChangesClient({ pending, hasDraft, items, history, ownerName }: { pending: { summary: string; steps: string[]; checks: any; createdAt: string } | null; hasDraft: boolean; items: Array<{ kind: string; id: string; name: string; change: string; before: Card; after: Card }>; history: Array<{ id: string; versionNo: number; note: string; kind: string; createdBy: string; publishedAt: string; current: boolean; applied: string }>; ownerName: string }) {
  const router = useRouter(); const [tab, setTab] = useState<"library" | "code">("library"); const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState(pending?.checks || null);
  async function act(action: string, extra: any = {}, done = "") {
    setBusy(true);
    try { const r = await api("/api/admin/changes", { json: { action, ...extra } }); if (r.checks) setChecks(r.checks); if (done) toast(done); router.refresh(); }
    catch (e: any) { toast(e.message, 9000); }
    setBusy(false);
  }
  const side = (label: string, c: Card) => (
    <div className="min-w-0 flex-1 rounded-lg bg-surface-container-low p-3"><p className="micro mb-2">{label}</p>
      {c ? <>{c.html && <div className="mx-auto mb-2 max-w-[140px] shadow-paper" dangerouslySetInnerHTML={{ __html: c.html }} />}<ul className="space-y-0.5 text-body-sm text-on-surface-variant">{c.lines.filter(Boolean).slice(0, 12).map((l, i) => <li key={i}>{l}</li>)}</ul></> : <p className="text-body-sm text-outline">—</p>}</div>);
  return (<>
    <section className="card p-5" aria-labelledby="pend">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="pend" className="font-serif text-headline-sm">{hasDraft && items.length ? "Pending change" : "Nothing pending"}</h2>
          {pending && items.length > 0 && <p className="text-body-sm text-on-surface-variant">Prepared by Claude and you · requested by {ownerName} · {new Date(pending.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>}</div>
        {hasDraft && items.length > 0 && <div className="flex flex-wrap gap-2"><Link className="btn btn-sm" href="/library?lib=draft">Preview in the library</Link><button className="btn btn-sm" disabled={busy} onClick={() => act("check", {}, "Checks finished.")}>Check</button>
          <button className="btn btn-sm btn-danger" disabled={busy} onClick={async () => { if (await confirmBox("Discard the pending change?", "The draft goes back to the published library.", "Discard", "Cancel", true)) act("discard", {}, "Discarded."); }}>Discard</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act("apply", {}, "Published. Members get it on their next page load.")}>Approve and publish</button></div>}
      </div>
      <div className="mt-4 flex gap-1 border-b border-outline-variant" role="tablist">
        {(["library", "code"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-label-md ${tab === t ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>{t === "library" ? `Library changes (${items.length})` : "Code changes"}</button>)}
      </div>
      {tab === "library" ? (items.length ? <>
        <ul className="mt-4 space-y-4">{items.map(it => <li key={it.kind + it.id}><p className="mb-2 text-title-sm">{it.name} <span className="text-body-sm font-normal text-on-surface-variant">· {it.kind} {it.change}</span></p><div className="flex flex-col gap-3 sm:flex-row">{side("Before", it.before)}{side("After", it.after)}</div></li>)}</ul>
        {checks && <><p className="micro mt-5">Checks</p><ChecksList checks={checks} /></>}
        {pending?.steps?.length ? <details className="mt-4"><summary className="cursor-pointer text-label-md">{pending.steps.length} steps taken</summary><ul className="mt-2 list-disc pl-5 text-body-sm text-on-surface-variant">{pending.steps.map((s, i) => <li key={i}>{s}</li>)}</ul></details> : null}
      </> : <p className="mt-4 text-body-md text-on-surface-variant">No library changes are waiting. Ask in the <Link href="/admin/lab" className="font-semibold text-primary">Studio Lab</Link> or edit in <Link href="/admin/builder" className="font-semibold text-primary">Templates &amp; covers</Link>.</p>)
        : <p className="mt-4 text-body-md text-on-surface-variant">Code changes (Claude opening pull requests with a preview site and automated checks) come in the next build round, together with payments. Until then, code changes go through GitHub directly.</p>}
    </section>
    <section className="mt-6" aria-labelledby="vh">
      <h2 id="vh" className="font-serif text-headline-sm">Version history</h2>
      <p className="mt-2 rounded-lg bg-surface-container-low p-3 text-body-sm">Every change you apply is saved. Rolling back is itself saved, so you can undo a rollback.</p>
      <ol className="mt-4 space-y-3">{history.map((v, i) => (
        <li key={v.id} className="card flex flex-wrap items-center gap-4 p-4">
          <span className="font-serif text-headline-sm tabular text-primary">v{v.versionNo}</span>
          <div className="min-w-0 flex-1"><p className="text-title-sm">{v.applied || v.note || "Library version"}</p><p className="text-body-sm text-on-surface-variant">{v.createdBy === "seed" ? "Initial library" : `Approved by ${ownerName}`} · {new Date(v.publishedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></div>
          <span className={`badge ${v.kind === "rollback" ? "bg-secondary-fixed text-secondary" : "bg-surface-container-high text-on-surface-variant"}`}>{v.kind === "rollback" ? "Restore" : v.kind === "seed" ? "Seed" : "Library"}</span>
          {v.current && <span className="badge bg-tertiary-fixed text-tertiary">Live</span>}
          {i < history.length - 1 && <button className="btn btn-sm" disabled={busy} onClick={async () => { if (await confirmBox(`Roll back to before v${v.versionNo}?`, "The version published before this one becomes live again, as a new version. Members get it on their next page load.", "Roll back")) act("rollback", { versionId: v.id }, "Rolled back."); }}>Roll back to before this</button>}
        </li>))}</ol>
    </section>
  </>);
}
