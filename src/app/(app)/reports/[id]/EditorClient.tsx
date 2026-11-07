"use client";
/* Client side of the editor page: mounts the framework-free editor (src/editor/editor.js) and wires it to the API.
   The save chip and Download Word button sit in the app header and talk to the editor through context. */
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/components/client/useApi";

type Status = "saved" | "saving" | "error" | "idle";
interface Ctx { status: Status; setStatus(s: Status): void; editor: React.MutableRefObject<any>; props: Props }
interface Props { id: string; library: any; report: any; draft: string; aiEnabled: boolean; notices: string[]; previewingDraft: boolean }
const EdCtx = createContext<Ctx | null>(null);

export function EditorProvider({ children, ...props }: Props & { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const editor = useRef<any>(null);
  return <EdCtx.Provider value={{ status, setStatus, editor, props }}>{children}</EdCtx.Provider>;
}

/** Stream a fetch body as text chunks. */
async function streamPost(url: string, payload: any, onText: (t: string) => void, signal: AbortSignal) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Request failed (${r.status}).`); }
  const reader = r.body.getReader(); const dec = new TextDecoder();
  for (;;) { const { done, value } = await reader.read(); if (done) break; onText(dec.decode(value, { stream: true })); }
}

export function EditorMount() {
  const ctx = useContext(EdCtx)!; const { props } = ctx;
  const root = useRef<HTMLDivElement>(null); const router = useRouter();
  useEffect(() => {
    let alive = true; let ed: any = null;
    (async () => {
      const { mountEditor } = await import("@/editor/editor.js");
      if (!alive || !root.current) return;
      const base = `/api/reports/${props.id}`;
      ed = mountEditor(root.current, {
        lib: props.library, report: props.report, draft: props.draft, ai: { enabled: props.aiEnabled },
        navigate: (p: string) => router.push(p),
        onStatus: (s: Status) => ctx.setStatus(s),
        api: {
          save: (body: any) => api(base, { method: "PUT", json: { body } }),
          saveDraft: (text: string) => api(`${base}/draft`, { method: "PUT", json: { text } }),
          duplicate: async () => (await api(`${base}/duplicate`, { method: "POST" })).id,
          remove: () => api(base, { method: "DELETE" }),
          uploadImage: async (blob: Blob, type: string, w: number, h: number) => {
            const f = new FormData(); f.append("file", new File([blob], "image", { type })); f.append("kind", "report"); f.append("w", String(w)); f.append("h", String(h));
            return api("/api/upload", { form: f });
          },
          logExport: (templateId: string) => api("/api/events", { json: { type: "word_export", detail: { templateId } } }),
          structure: (payload: any, o: { onText: (t: string) => void; signal: AbortSignal }) => streamPost("/api/ai/structure", payload, o.onText, o.signal),
          refine: (payload: any) => api("/api/ai/refine", { json: payload })
        }
      });
      ctx.editor.current = ed;
      if (props.notices.length) { const { toast } = await import("@/editor/ui.js"); props.notices.forEach(n => toast(n, 7000)); }
    })();
    const before = (e: BeforeUnloadEvent) => { if (ctxStatus.current === "saving") { e.preventDefault(); } };
    window.addEventListener("beforeunload", before);
    return () => { alive = false; window.removeEventListener("beforeunload", before); if (ed) ed.destroy(); ctx.editor.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);
  const ctxStatus = useRef(ctx.status); ctxStatus.current = ctx.status;
  return (
    <>
      {props.previewingDraft && <div className="border-b border-secondary/30 bg-secondary-fixed/50 px-4 py-2 text-body-sm">Owner preview: this editor uses the draft library with pending Studio Lab changes.</div>}
      <div ref={root} className="min-h-[60vh]"><div className="p-10 text-center text-body-md text-on-surface-variant">Opening the editor…</div></div>
    </>
  );
}

export function EditorToolbar() {
  const ctx = useContext(EdCtx)!;
  const [open, setOpen] = useState(false);
  const label = { saved: "All changes saved", saving: "Saving…", error: "Not saved — retrying on next edit", idle: "Saved" }[ctx.status];
  return (
    <>
      <span className={`hidden items-center gap-1.5 rounded px-2 py-0.5 text-label-micro uppercase md:inline-flex ${ctx.status === "error" ? "bg-error-container text-on-error-container" : "bg-surface-container-low text-tertiary"}`} role="status">
        <span className={`h-1.5 w-1.5 rounded-full ${ctx.status === "error" ? "bg-error" : ctx.status === "saving" ? "animate-pulse bg-secondary" : "bg-tertiary"}`} />{label}
      </span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><span className="icon text-[18px]" aria-hidden="true">download</span><span className="hidden sm:inline">Download Word</span></button>
      {open && <ExportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ExportDialog({ onClose }: { onClose(): void }) {
  const ctx = useContext(EdCtx)!;
  const [name, setName] = useState(() => ctx.editor.current?.filename || "report");
  const [docInfo, setDocInfo] = useState(true); const [contents, setContents] = useState(true);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle"); const [err, setErr] = useState("");
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  async function go() {
    const ed = ctx.editor.current; if (!ed) return;
    setState("busy"); setErr("");
    try { await ed.flush(); const file = await ed.exportWord({ filename: name, docInfo, contents }); setState("done"); setName(file.replace(/\.docx$/, "")); }
    catch (e: any) { console.error(e); setErr(e.message || "The Word file couldn't be built."); setState("error"); }
  }
  return (
    <div className="rs-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rs-modal" role="dialog" aria-modal="true" aria-labelledby="exp-t">
        <h3 id="exp-t">Download your report</h3>
        {state === "done" ? (<>
          <p className="flex items-start gap-2"><span className="icon text-primary" aria-hidden="true">check_circle</span><span><strong className="text-on-surface">{name}.docx</strong> has downloaded. Open it in Word; if the contents list is empty, right-click it and choose Update Field.</span></p>
          <div className="rs-actions"><button className="btn" onClick={() => setState("idle")}>Download again</button><button className="btn btn-primary" onClick={onClose}>Done</button></div>
        </>) : (<>
          <fieldset className="space-y-2"><legend className="micro mb-2">Format</legend>
            <label className="flex items-start gap-2 rounded-lg border border-primary-container p-3"><input type="radio" name="fmt" defaultChecked className="mt-1" /><span><span className="block text-title-sm">Word (.docx)</span><span className="text-body-sm text-on-surface-variant">Recommended. Fully editable, with real Word charts.</span></span></label>
            <label className="flex items-start gap-2 rounded-lg border border-outline-variant p-3 opacity-60"><input type="radio" name="fmt" disabled className="mt-1" /><span><span className="block text-title-sm">PDF</span><span className="text-body-sm text-on-surface-variant">Not built in yet. Open the Word file and choose File › Save as › PDF.</span></span></label>
          </fieldset>
          <fieldset className="mt-4 space-y-2"><legend className="micro mb-2">Include</legend>
            <label className="flex items-center gap-2 text-body-md"><input type="checkbox" checked={docInfo} onChange={e => setDocInfo(e.target.checked)} />Document information page</label>
            <label className="flex items-center gap-2 text-body-md"><input type="checkbox" checked={contents} onChange={e => setContents(e.target.checked)} />Contents page</label>
            <p className="text-body-sm text-on-surface-variant">Page size: A4 portrait.</p>
          </fieldset>
          <label className="label mt-4" htmlFor="exp-name">File name</label>
          <div className="flex items-center gap-2"><input id="exp-name" className="field" value={name} onChange={e => setName(e.target.value)} /><span className="text-body-sm text-on-surface-variant">.docx</span></div>
          {err && <p role="alert" className="mt-3 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{err}</p>}
          <div className="rs-actions mt-6"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={state === "busy" || !name.trim()} onClick={go}>{state === "busy" ? "Building the Word file…" : "Download"}</button></div>
        </>)}
      </div>
    </div>
  );
}
