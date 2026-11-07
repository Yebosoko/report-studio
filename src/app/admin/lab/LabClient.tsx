"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/components/client/useApi";
import { confirmBox, toast, toImageBlob } from "@/editor/ui.js";
import type { LabThread } from "@/lib/types";
import { ChecksList, DiffRows } from "../changes/ChangeBits";

const SUGGEST = ["Create a template for an Environmental and Social Commitment Plan (ESCP) with an action table per ESS", "Create a marine ecology colour theme", "Add a writing rule: use PAPs, not affected people"];
async function toB64(blob: Blob) { const buf = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); }

export function LabClient({ initialThread, samples, pending, diff, preview, model, connected, initialSample, initialAsk }: { initialThread: LabThread; samples: Array<{ id: string; name: string; studied: boolean }>; pending: { summary: string; checks: any } | null; diff: any[]; preview: { html: string; label: string; templateId?: string } | null; model: string; connected: boolean; initialSample: string; initialAsk: string }) {
  const router = useRouter();
  const [thread, setThread] = useState(initialThread);
  const [msg, setMsg] = useState(initialAsk || (initialSample ? "Make a template like this sample." : ""));
  const [sample, setSample] = useState(initialSample);
  const [images, setImages] = useState<Array<{ name: string; media_type: string; data: string }>>([]);
  const [running, setRunning] = useState(false); const [live, setLive] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const ctl = useRef<AbortController | null>(null); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [thread, live]);
  const canContinue = !running && !!thread.pending?.continueFrom;

  async function send(cont = false) {
    if (!cont && !msg.trim()) return;
    setRunning(true); setLive([]);
    const now = new Date().toISOString();
    setThread(t => ({ ...t, turns: [...t.turns, { role: "user", text: cont ? "(Continue)" : msg, at: now, attach: [...images.map(i => i.name), ...(sample ? ["sample:" + sample] : [])] }] }));
    const payload = { message: msg, images: images.map(({ media_type, data }) => ({ media_type, data })), sampleId: sample || undefined, continue: cont };
    setMsg(""); setImages([]);
    ctl.current = new AbortController();
    try {
      const r = await fetch("/api/admin/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctl.current.signal });
      if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Request failed (${r.status}).`); }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const l of lines) { if (!l.trim()) continue; let e: any; try { e = JSON.parse(l); } catch { continue; }
          if (e.type === "step") setLive(x => [...x, e.text]);
          if (e.type === "error") toast(e.text, 6000);
        }
      }
    } catch (e: any) { if (e.name !== "AbortError") toast(e.message, 6000); }
    try { setThread(await api("/api/admin/lab")); } catch {}
    setRunning(false); setLive([]); setSample(""); router.refresh();
  }
  async function attach(files: FileList | null) {
    if (!files) return; const out = [...images];
    for (const f of Array.from(files).slice(0, 6 - out.length)) { try { const im = await toImageBlob(f, 1600); out.push({ name: f.name, media_type: im.type, data: await toB64(im.blob) }); } catch { toast(`Couldn't use ${f.name}.`); } }
    setImages(out);
  }
  async function change(action: "apply" | "discard" | "check") {
    if (action === "discard" && !(await confirmBox("Discard the pending change?", "The draft library goes back to the published version. The conversation stays.", "Discard", "Cancel", true))) return;
    setBusy(true);
    try { await api("/api/admin/changes", { json: { action } }); toast(action === "apply" ? "Published. Members get it on their next page load." : action === "discard" ? "Discarded." : "Checks finished."); router.refresh(); }
    catch (e: any) { toast(e.message, 8000); }
    setBusy(false);
  }
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card flex min-h-[560px] flex-col" aria-label="Conversation with Claude">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant p-5">
          <div><h2 className="font-serif text-headline-sm">Improve the studio</h2><p className="text-body-sm text-on-surface-variant">Library changes only in this lane. Code changes arrive with the next round.</p></div>
          <div className="flex items-center gap-2"><span className="badge bg-surface-container text-on-surface-variant">{model}</span>
            {thread.turns.length > 0 && <button className="btn btn-sm btn-ghost" disabled={running} onClick={async () => { if (await confirmBox("Clear the conversation?", "The pending change and draft library are kept.", "Clear")) { await api("/api/admin/lab", { method: "DELETE" }); setThread({ turns: [], pending: null }); } }}>Clear</button>}</div>
        </div>
        {!connected && <p className="m-5 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">Claude isn&apos;t connected. Add ANTHROPIC_API_KEY to the server&apos;s environment variables (see README), then reload.</p>}
        <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
          {thread.turns.length === 0 && !running && <p className="text-body-md text-on-surface-variant">Describe a change, for example a new template based on a sample you uploaded. Claude works on a draft; you review it on the right and press Apply.</p>}
          {thread.turns.map((t, i) => (
            <div key={i} className="flex gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.role === "user" ? "bg-primary text-on-primary" : "bg-secondary-fixed text-secondary"}`}><span className="icon text-[18px]" aria-hidden="true">{t.role === "user" ? "person" : "auto_awesome"}</span></span>
              <div className="min-w-0 flex-1">
                <p className="text-title-sm">{t.role === "user" ? "You" : "Claude"} <span className="ml-2 text-body-sm font-normal text-outline">{new Date(t.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>{t.status === "QUESTION" && <span className="badge ml-2 bg-secondary-fixed text-secondary">Question</span>}</p>
                <div className={`mt-1 whitespace-pre-wrap text-body-md ${t.role === "user" ? "rounded-lg bg-surface-container-low p-3" : ""} ${t.status === "ERROR" ? "text-error" : ""}`}>{t.text}</div>
                {t.attach && t.attach.length > 0 && <p className="mt-1 text-body-sm text-on-surface-variant">Attached: {t.attach.map(a => a.startsWith("sample:") ? samples.find(s => s.id === a.slice(7))?.name || "a sample" : a).join(", ")}</p>}
                {t.steps && t.steps.length > 0 && <details className="mt-2 rounded-lg bg-surface-container-low p-3"><summary className="cursor-pointer text-label-md">{t.steps.length} steps</summary><ul className="mt-2 space-y-1 text-body-sm">{t.steps.map((s, j) => <li key={j} className="flex gap-2"><span className="icon text-[16px] text-tertiary" aria-hidden="true">check_circle</span>{s}</li>)}</ul></details>}
              </div>
            </div>))}
          {running && <div className="rounded-lg bg-surface-container-low p-3"><p className="flex items-center gap-2 text-label-md"><span className="h-3 w-3 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />Claude is working…</p>
            {live.length > 0 && <ul className="mt-2 space-y-1 text-body-sm">{live.map((s, j) => <li key={j}>· {s}</li>)}</ul>}</div>}
          <div ref={end} />
        </div>
        <div className="border-t border-outline-variant p-4">
          {images.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{images.map((im, i) => <span key={i} className="chip">{im.name}<button aria-label={`Remove ${im.name}`} onClick={() => setImages(images.filter((_, j) => j !== i))} className="icon text-[16px]">close</button></span>)}</div>}
          <label htmlFor="lab-msg" className="sr-only">Your request</label>
          <textarea id="lab-msg" className="field min-h-[96px]" placeholder="Ask Claude for new templates, covers, themes or writing rules…" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} disabled={running} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="btn btn-sm rs-file"><span className="icon text-[18px]" aria-hidden="true">image</span>Attach images<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e => { attach(e.target.files); e.target.value = ""; }} /></label>
            <select className="field !w-auto py-1.5 text-body-sm" value={sample} onChange={e => setSample(e.target.value)} aria-label="Attach a sample"><option value="">Attach a sample…</option>{samples.map(s => <option key={s.id} value={s.id}>{s.name}{s.studied ? "" : " (not studied)"}</option>)}</select>
            <span className="flex-1" />
            {running ? <button className="btn btn-sm" onClick={() => ctl.current?.abort()}>Stop</button> : <>
              {canContinue && <button className="btn btn-sm" onClick={() => send(true)}>Continue</button>}
              <button className="btn btn-primary btn-sm" disabled={!msg.trim() || !connected} onClick={() => send()}>Send<span className="icon text-[18px]" aria-hidden="true">send</span></button></>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className="micro">Suggested</span>{SUGGEST.map(s => <button key={s} className="chip" onClick={() => setMsg(s)}>{s}</button>)}</div>
        </div>
      </section>
      <div className="space-y-6">
        <section className="card p-5" aria-labelledby="pc"><h2 id="pc" className="micro text-primary">Pending changes</h2>
          {diff.length ? (<>
            <DiffRows diff={diff} />
            {pending?.checks && <ChecksList checks={pending.checks} />}
            <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-sm" disabled={busy} onClick={() => change("check")}>Check</button><button className="btn btn-sm btn-ghost btn-danger" disabled={busy} onClick={() => change("discard")}>Discard</button><button className="btn btn-primary btn-sm flex-1" disabled={busy || running} onClick={() => change("apply")}>Apply changes</button></div>
            <Link href="/admin/changes" className="rs-link mt-3 inline-block">Review in detail</Link>
          </>) : <p className="mt-2 text-body-sm text-on-surface-variant">Nothing pending. Changes Claude makes appear here for review.</p>}
        </section>
        {preview && <section className="card p-5" aria-labelledby="lp"><h2 id="lp" className="micro text-primary">Live preview · {preview.label}</h2>
          <div className="mt-3 rounded-lg bg-desk p-5"><div className="mx-auto max-w-[220px] shadow-paper" dangerouslySetInnerHTML={{ __html: preview.html }} /></div>
          <Link href="/library?lib=draft" className="btn btn-sm mt-3 w-full">Try it in the editor<span className="icon text-[16px]" aria-hidden="true">open_in_new</span></Link></section>}
      </div>
    </div>
  );
}
