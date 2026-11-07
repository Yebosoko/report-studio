"use client";
/* Upload a sample: PDF pages are drawn with pdf.js and the owner picks up to 8; images upload as pages; Word files give text only. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client/useApi";
import { toast, toImageBlob } from "@/editor/ui.js";

const MAX_PICK = 8, MAX_THUMBS = 60;
export function UploadSample() {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState<null | { kind: string; name: string; pageCount: number; thumbs: string[]; pick: number[]; text: string; doc?: any; images?: File[] }>(null);
  const [form, setForm] = useState({ name: "", organisation: "", notes: "" });
  const [busy, setBusy] = useState(""); 
  async function open(files: FileList | File[]) {
    const arr = Array.from(files); if (!arr.length) return;
    const f = arr[0]; const base = f.name.replace(/\.[^.]+$/, "");
    setForm({ name: base, organisation: "", notes: "" });
    try {
      if (/\.pdf$/i.test(f.name)) {
        setBusy("Reading the PDF…");
        const { openPdf, renderPdfPage, pdfText } = await import("@/editor/importers.js");
        const doc = await openPdf(f); const n = doc.numPages; const thumbs: string[] = [];
        for (let i = 1; i <= Math.min(n, MAX_THUMBS); i++) { const c = await renderPdfPage(doc, i, 160); thumbs.push(c.toDataURL("image/jpeg", 0.7)); }
        const text = await pdfText(doc, 30, 20000);
        setState({ kind: "PDF", name: f.name, pageCount: n, thumbs, pick: Array.from({ length: Math.min(n, 4) }, (_, i) => i + 1), text, doc });
      } else if (/\.docx$/i.test(f.name)) {
        setBusy("Reading the Word file…"); const { importText } = await import("@/editor/importers.js");
        setState({ kind: "Word", name: f.name, pageCount: 0, thumbs: [], pick: [], text: (await importText(f)).slice(0, 20000) });
      } else {
        const imgs = arr.filter(x => /^image\/(png|jpeg|webp)$/.test(x.type)).slice(0, MAX_PICK);
        if (!imgs.length) throw new Error("Use a PDF, PNG/JPEG images or a Word file.");
        setState({ kind: "Images", name: f.name, pageCount: imgs.length, thumbs: imgs.map(x => URL.createObjectURL(x)), pick: imgs.map((_, i) => i + 1), text: "", images: imgs });
      }
    } catch (e: any) { toast(e.message || "Couldn't read that file."); }
    setBusy("");
  }
  async function save(study: boolean) {
    if (!state || !form.name.trim()) return;
    setBusy("Uploading…");
    try {
      const fd = new FormData(); fd.append("name", form.name); fd.append("organisation", form.organisation); fd.append("notes", form.notes); fd.append("kind", state.kind); fd.append("pageCount", String(state.pageCount)); fd.append("text", state.text);
      for (const p of state.pick) {
        let blob: Blob, w: number, h: number;
        if (state.doc) { const { renderPdfPage } = await import("@/editor/importers.js"); const c = await renderPdfPage(state.doc, p, 1200); w = c.width; h = c.height; blob = await new Promise<Blob>(r => c.toBlob(b => r(b!), "image/jpeg", 0.82)); }
        else { const im = await toImageBlob(state.images![p - 1], 1400); blob = im.blob; w = im.w; h = im.h; }
        fd.append(`page_${p}`, new File([blob], `p${p}.jpg`, { type: blob.type })); fd.append(`dims_${p}`, `${w}x${h}`);
      }
      const { sample } = await api("/api/admin/samples", { form: fd });
      if (study) { setBusy("Claude is studying the design… about a minute."); try { await api(`/api/admin/samples/${sample.id}`, { json: { action: "study" } }); } catch (e: any) { toast(e.message, 7000); } }
      setState(null); router.push(`/admin/samples/${sample.id}`);
    } catch (e: any) { toast(e.message); }
    setBusy("");
  }
  return (<>
    <label onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); open(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center ${drag ? "border-primary bg-surface-container" : "border-outline-variant bg-surface-container-lowest"}`}>
      <span className="icon text-[36px] text-primary" aria-hidden="true">upload_file</span>
      <span className="mt-2 text-title-sm">{busy || "Drop a PDF, images or a Word file"}</span><span className="text-body-sm text-on-surface-variant">or choose a file · up to {MAX_PICK} pages are kept for the study</span>
      <input type="file" className="sr-only" accept=".pdf,.docx,image/png,image/jpeg,image/webp" multiple onChange={e => { if (e.target.files) open(e.target.files); e.target.value = ""; }} />
    </label>
    {state && (
      <div className="rs-scrim"><div className="rs-modal wide" role="dialog" aria-modal="true" aria-labelledby="up-t">
        <h3 id="up-t">Upload a sample</h3>
        {state.thumbs.length > 0 && <><p>Choose up to {MAX_PICK} pages that show the design best ({state.pick.length} selected{state.pageCount > MAX_THUMBS ? `; first ${MAX_THUMBS} of ${state.pageCount} shown` : ""}).</p>
          <div className="grid max-h-[46vh] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-5 lg:grid-cols-6">{state.thumbs.map((t, i) => { const n = i + 1; const on = state.pick.includes(n); return (
            <button key={n} type="button" aria-pressed={on} onClick={() => setState(s => s && ({ ...s, pick: on ? s.pick.filter(x => x !== n) : s.pick.length < MAX_PICK ? [...s.pick, n].sort((a, b) => a - b) : s.pick }))} className={`rounded border-2 p-1 ${on ? "border-primary" : "border-transparent"}`}>
              <img src={t} alt={`Page ${n}`} className="w-full bg-white shadow-card" /><span className="mt-1 block text-body-sm">{n}</span></button>); })}</div></>}
        {state.kind === "Word" && <p>Word files are studied from their text and structure only. For the visual design, upload a PDF of the same report.</p>}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="s-n">Name</label><input id="s-n" className="field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="s-o">Organisation</label><input id="s-o" className="field" placeholder="e.g. AfDB, UNDP, Own work" value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="s-l">What do you like about it?</label><textarea id="s-l" className="field min-h-[80px]" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="rs-actions mt-5"><button className="btn" onClick={() => setState(null)} disabled={!!busy}>Cancel</button><button className="btn" onClick={() => save(false)} disabled={!!busy || !form.name.trim()}>Save only</button><button className="btn btn-primary" onClick={() => save(true)} disabled={!!busy || !form.name.trim()}>{busy || "Save and study"}</button></div>
      </div></div>)}
  </>);
}
