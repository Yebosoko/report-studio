"use client";
import { useMemo, useState } from "react";
import { makeLib } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { api } from "@/components/client/useApi";
import { toast, toImageBlob } from "@/editor/ui.js";
import type { Brand } from "@/lib/types";

export function BrandForm({ brand, library }: { brand: Brand; library: any }) {
  const L = useMemo(() => makeLib(library), [library]);
  const [b, setB] = useState<Brand>(brand);
  const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const set = (p: Partial<Brand>) => { setB(x => ({ ...x, ...p })); setDirty(true); };
  const tpl = library.templates[0];
  const theme = b.defaultTheme || tpl.theme, font = b.defaultFont || tpl.font;
  const th = L.theme(theme), f = L.font(font);
  const logoURL = b.logo ? "/api/files/" + b.logo.path.split("/").map(encodeURIComponent).join("/") : null;
  const preview = `<div style="${RD.varStyle(th, f)}">${RD.cover({ def: L.cover(tpl.cover), theme: th, font: f, abbr: tpl.abbr, logo: logoURL, meta: { title: "Your report title", subtitle: "Project, place and period", docType: tpl.docType, client: "Client name", preparedBy: b.preparedBy || "Your firm", date: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }), version: "Draft v1.0" } })}</div>`;
  async function upload(file: File) {
    try { const im = await toImageBlob(file, 800, true); const fd = new FormData(); fd.append("file", new File([im.blob], "logo", { type: im.type })); fd.append("kind", "logo"); fd.append("w", String(im.w)); fd.append("h", String(im.h));
      const ref = await api("/api/upload", { form: fd }); set({ logo: ref }); } catch (e: any) { toast(e.message || "Couldn't use that image."); }
  }
  async function save() { setBusy(true); try { await api("/api/brand", { method: "PUT", json: b }); setDirty(false); toast("Brand saved. New reports will use it."); } catch (e: any) { toast(e.message); } setBusy(false); }
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="card space-y-6 p-6">
        <div><label className="label" htmlFor="pb">Company name (Prepared by)</label><input id="pb" className="field" value={b.preparedBy} onChange={e => set({ preparedBy: e.target.value })} placeholder="e.g. Coastal Safeguards Ltd" /></div>
        <div><span className="label">Logo</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-16 w-40 place-items-center rounded-lg border border-dashed border-outline-variant bg-white p-2">{logoURL ? <img src={logoURL} alt="Your logo" className="max-h-full max-w-full object-contain" /> : <span className="text-body-sm text-outline">No logo</span>}</div>
            <label className="btn btn-sm rs-file">Upload PNG or JPEG<input type="file" accept="image/png,image/jpeg" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} /></label>
            {b.logo && <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ logo: null })}>Remove</button>}
          </div></div>
        <div><span className="label">Default colour theme</span>
          <div className="rs-swatches !grid-cols-4 sm:!grid-cols-8">{library.themes.map((t: any) => (
            <button key={t.id} type="button" className="rs-sw" aria-pressed={theme === t.id} onClick={() => set({ defaultTheme: t.id })} title={t.name}><span className="rs-dot" style={{ background: `#${t.primary}`, boxShadow: `inset -9px 0 0 #${t.accent}` }} /><small>{t.name}</small></button>
          ))}</div>
          <button type="button" className="rs-link mt-2" onClick={() => set({ defaultTheme: null })}>Use each template's own theme</button></div>
        <div><span className="label">Default typefaces</span>
          <div className="rs-seg max-w-md">{library.fonts.map((x: any) => <button key={x.id} type="button" aria-pressed={font === x.id} onClick={() => set({ defaultFont: x.id })}>{x.name}</button>)}</div></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="ce">Contact email <span className="text-outline">(optional)</span></label><input id="ce" className="field" type="email" value={b.contactEmail} onChange={e => set({ contactEmail: e.target.value })} /></div>
          <div><label className="label" htmlFor="cp">Contact phone <span className="text-outline">(optional)</span></label><input id="cp" className="field" value={b.contactPhone} onChange={e => set({ contactPhone: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-3"><button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save brand"}</button>{dirty && <span className="text-body-sm text-on-surface-variant">Unsaved changes</span>}</div>
      </div>
      <div><p className="micro mb-3">Live preview</p><div className="rounded-xl bg-desk p-6"><div className="sheet" dangerouslySetInnerHTML={{ __html: preview }} /></div></div>
    </div>
  );
}
