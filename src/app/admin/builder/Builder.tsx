"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { makeLib, validateLibrary, STYLE_OPTIONS, STYLE_LABELS, COLOR_NAMES, COVER_ITEM_KINDS } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { api } from "@/components/client/useApi";
import { toast } from "@/editor/ui.js";

type Kind = "templates" | "themes" | "covers";
const SINGULAR: Record<Kind, string> = { templates: "template", themes: "theme", covers: "cover" };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";

export function Builder({ initial }: { initial: any }) {
  const router = useRouter();
  const [lib, setLib] = useState<any>(() => structuredClone(initial));
  const [kind, setKind] = useState<Kind>("templates");
  const [sel, setSel] = useState<string>(initial.templates[0].id);
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const L = useMemo(() => { try { return makeLib(lib); } catch { return null; } }, [lib]);
  const v = useMemo(() => validateLibrary(lib), [lib]);
  const item = lib[kind].find((x: any) => x.id === sel) || lib[kind][0];
  const update = (patch: any) => { setLib((l: any) => { const n = structuredClone(l); const i = n[kind].findIndex((x: any) => x.id === item.id); n[kind][i] = { ...n[kind][i], ...patch }; return n; }); setDirty(true); };
  function add() {
    const base = structuredClone(lib[kind][0]); let id = `new-${SINGULAR[kind]}`, n = 2; while (lib[kind].some((x: any) => x.id === id)) id = `new-${SINGULAR[kind]}-${n++}`;
    base.id = id; base.name = `New ${SINGULAR[kind]}`; if (kind === "templates") base.abbr = "NEW";
    setLib((l: any) => ({ ...l, [kind]: [...l[kind], base] })); setSel(id); setDirty(true);
  }
  function remove() {
    if (lib[kind].length < 2) return toast("Keep at least one.");
    if (kind !== "templates") { const users = lib.templates.filter((t: any) => t[SINGULAR[kind]] === item.id); if (users.length) return toast(`Used by: ${users.map((t: any) => t.name).join(", ")}. Change those first.`, 6000); }
    setLib((l: any) => ({ ...l, [kind]: l[kind].filter((x: any) => x.id !== item.id) })); setSel(lib[kind][0].id === item.id ? lib[kind][1].id : lib[kind][0].id); setDirty(true);
  }
  async function save() {
    if (v.errors.length) return toast("Fix the problems listed first.");
    setBusy(true);
    try { const r = await api("/api/admin/library", { method: "PUT", json: { library: lib, note: "Builder change", steps: ["Edited in Templates & covers"] } }); setDirty(false); toast(r.changes ? "Saved as a pending change. Review it in Changes & versions." : "No differences from the published library."); router.refresh(); }
    catch (e: any) { toast(e.message, 8000); }
    setBusy(false);
  }
  const list = lib[kind].filter((x: any) => !q || (x.name + x.id).toLowerCase().includes(q.toLowerCase()));
  const tpl = kind === "templates" ? item : lib.templates[0];
  const over = kind === "themes" ? { theme: item.id, title: item.name } : kind === "covers" ? { cover: item.id, title: item.name } : undefined;
  let preview = ""; try { if (L) preview = RD.thumb(L, L.tpl(tpl.id), over); } catch (e: any) { preview = `<p style="padding:12px;color:#ba1a1a">Preview failed: ${String(e.message).replace(/</g, "&lt;")}</p>`; }
  const ask = `Refine the ${SINGULAR[kind]} "${item.name}" (${item.id}): `;
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <aside className="card p-3">
        <div className="flex gap-1" role="tablist">{(["templates", "themes", "covers"] as Kind[]).map(k => <button key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setSel(lib[k][0].id); }} className={`flex-1 rounded px-2 py-1.5 text-label-md capitalize ${kind === k ? "bg-surface-container font-semibold text-primary" : "text-on-surface-variant"}`}>{k}</button>)}</div>
        <input className="field mt-3" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
        <ul className="mt-2 max-h-[50vh] space-y-0.5 overflow-y-auto">{list.map((x: any) => <li key={x.id}><button onClick={() => setSel(x.id)} aria-current={x.id === item.id} className={`w-full truncate rounded px-2 py-1.5 text-left text-body-sm ${x.id === item.id ? "bg-primary-container text-on-primary" : "hover:bg-surface-container"}`}>{x.name}</button></li>)}</ul>
        <button className="btn btn-sm mt-3 w-full" onClick={add}>+ New {SINGULAR[kind]}</button>
      </aside>
      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-headline-sm">{item.name}</h2><button className="btn btn-sm btn-ghost btn-danger" onClick={remove}>Delete {SINGULAR[kind]}</button></div>
        <div className="mt-4">{kind === "templates" ? <TemplateForm t={item} lib={lib} update={update} /> : kind === "themes" ? <ThemeForm t={item} update={update} /> : <CoverForm c={item} update={update} />}</div>
        {(v.errors.length > 0 || v.warnings.length > 0) && <ul className="mt-5 space-y-1 rounded-lg bg-surface-container-low p-3 text-body-sm">{v.errors.map((e: string, i: number) => <li key={i} className="text-error">✕ {e}</li>)}{v.warnings.slice(0, 6).map((e: string, i: number) => <li key={"w" + i} className="text-secondary">! {e}</li>)}</ul>}
        <div className="mt-5 flex flex-wrap gap-2"><Link className="btn" href={`/admin/lab?ask=${encodeURIComponent(ask)}`}>Ask Claude to refine</Link><button className="btn btn-primary" disabled={busy || !dirty || v.errors.length > 0} onClick={save}>{busy ? "Saving…" : "Save as pending change"}</button>{dirty && <span className="self-center text-body-sm text-on-surface-variant">Unsaved changes</span>}</div>
      </section>
      <aside className="space-y-4"><p className="micro">Live preview</p><div className="rounded-xl bg-desk p-5"><div className="mx-auto max-w-[240px] shadow-paper" dangerouslySetInnerHTML={{ __html: preview }} /></div>
        {kind === "templates" && L && <InsidePreview L={L} t={item} />}</aside>
    </div>
  );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block ${wide ? "sm:col-span-2" : ""}`}><span className="label">{label}</span>{children}</label>; }

function TemplateForm({ t, lib, update }: { t: any; lib: any; update: (p: any) => void }) {
  const secs = t.sections || []; const setSecs = (s: any[]) => update({ sections: s });
  const [dragI, setDragI] = useState<number | null>(null);
  return (<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <F label="Name"><input className="field" value={t.name} onChange={e => update({ name: e.target.value })} /></F>
    <F label="Id (lowercase, hyphens)"><input className="field font-mono" value={t.id} onChange={e => update({ id: slug(e.target.value) })} /></F>
    <F label="Abbreviation"><input className="field" value={t.abbr} onChange={e => update({ abbr: e.target.value.slice(0, 8) })} /></F>
    <F label="Category"><select className="field" value={t.cat} onChange={e => update({ cat: e.target.value })}>{lib.categories.map((c: string) => <option key={c}>{c}</option>)}</select></F>
    <F label="Document type" wide><input className="field" value={t.docType} onChange={e => update({ docType: e.target.value })} /></F>
    <F label="Description" wide><textarea className="field min-h-[64px]" value={t.desc || ""} onChange={e => update({ desc: e.target.value })} /></F>
    <F label="Theme"><select className="field" value={t.theme} onChange={e => update({ theme: e.target.value })}>{lib.themes.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
    <F label="Cover"><select className="field" value={t.cover} onChange={e => update({ cover: e.target.value })}>{lib.covers.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
    <F label="Typefaces"><select className="field" value={t.font} onChange={e => update({ font: e.target.value })}>{lib.fonts.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
    <div className="grid grid-cols-2 gap-2">{Object.keys(STYLE_OPTIONS).map(k => <F key={k} label={(STYLE_LABELS as any)[k]}><select className="field" value={(t.style || {})[k] || (STYLE_OPTIONS as any)[k][0][0]} onChange={e => update({ style: { ...(t.style || {}), [k]: e.target.value } })}>{(STYLE_OPTIONS as any)[k].map((o: any) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></F>)}</div>
    <div className="sm:col-span-2"><span className="label">Sections (drag to reorder)</span>
      <ol className="space-y-2">{secs.map((s: any, i: number) => (
        <li key={i} draggable onDragStart={() => setDragI(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragI == null || dragI === i) return; const n = [...secs]; const [m] = n.splice(dragI, 1); n.splice(i, 0, m); setSecs(n); setDragI(null); }}
          className="flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-2">
          <span className="icon mt-2 cursor-grab text-outline" aria-hidden="true">drag_indicator</span><span className="mt-2 w-6 text-body-sm tabular text-on-surface-variant">{i + 1}</span>
          <div className="grid grid-cols-1 min-w-0 flex-1 gap-1 sm:grid-cols-2"><input className="field py-1.5" aria-label={`Section ${i + 1} title`} value={s.title} onChange={e => { const n = [...secs]; n[i] = { ...s, title: e.target.value }; setSecs(n); }} /><input className="field py-1.5" aria-label={`Section ${i + 1} hint`} placeholder="Hint: what this section needs" value={s.hint || ""} onChange={e => { const n = [...secs]; n[i] = { ...s, hint: e.target.value }; setSecs(n); }} /></div>
          <div className="flex flex-col"><button className="icon text-[18px] text-on-surface-variant" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...secs]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setSecs(n); }}>arrow_upward</button><button className="icon text-[18px] text-on-surface-variant" aria-label="Move down" disabled={i === secs.length - 1} onClick={() => { const n = [...secs]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setSecs(n); }}>arrow_downward</button></div>
          <button className="icon mt-1.5 text-[18px] text-error" aria-label="Remove section" onClick={() => setSecs(secs.filter((_: any, j: number) => j !== i))}>close</button>
        </li>))}</ol>
      <button className="btn btn-sm mt-2" onClick={() => setSecs([...secs, { title: "New section", hint: "" }])}>+ Section</button></div>
  </div>);
}

function ThemeForm({ t, update }: { t: any; update: (p: any) => void }) {
  return (<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <F label="Name"><input className="field" value={t.name} onChange={e => update({ name: e.target.value })} /></F>
    <F label="Id"><input className="field font-mono" value={t.id} onChange={e => update({ id: slug(e.target.value) })} /></F>
    {["primary", "secondary", "accent", "tint", "dark"].map(k => <F key={k} label={k[0].toUpperCase() + k.slice(1)}><span className="flex gap-2"><input type="color" className="h-10 w-12 rounded border border-outline-variant" value={"#" + (t[k] || "000000")} onChange={e => update({ [k]: e.target.value.slice(1).toUpperCase() })} aria-label={`${k} colour`} /><input className="field font-mono" value={t[k]} onChange={e => update({ [k]: e.target.value.replace("#", "").toUpperCase().slice(0, 6) })} /></span></F>)}
  </div>);
}

function CoverForm({ c, update }: { c: any; update: (p: any) => void }) {
  const [json, setJson] = useState<string | null>(null);
  const rows = c.rows || []; const setRows = (r: any[]) => update({ rows: r });
  const total = rows.reduce((a: number, r: any) => a + (+r.h || 0), 0);
  const fills = ["", ...COLOR_NAMES];
  return (<div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><F label="Name"><input className="field" value={c.name} onChange={e => update({ name: e.target.value })} /></F><F label="Id"><input className="field font-mono" value={c.id} onChange={e => update({ id: slug(e.target.value) })} /></F></div>
    <p className="text-body-sm text-on-surface-variant">Rows stack down the A4 page (heights in % of page height, total {Math.round(total * 10) / 10}% of at most 100). Cells sit side by side (widths in % adding up to 100). Item kinds: {COVER_ITEM_KINDS.join(", ")}.</p>
    <ol className="space-y-3">{rows.map((r: any, ri: number) => (
      <li key={ri} className="rounded-lg border border-outline-variant p-3">
        <div className="flex flex-wrap items-center gap-2"><span className="micro">Row {ri + 1}</span><label className="flex items-center gap-1 text-body-sm">Height %<input type="number" step="0.1" className="field w-20 py-1" value={r.h} onChange={e => { const n = structuredClone(rows); n[ri].h = +e.target.value; setRows(n); }} /></label>
          <span className="flex-1" /><button className="btn btn-sm btn-ghost" onClick={() => { const n = structuredClone(rows); n[ri].cells.push({ w: 0, items: [] }); setRows(n); }}>+ Cell</button><button className="btn btn-sm btn-ghost btn-danger" onClick={() => setRows(rows.filter((_: any, j: number) => j !== ri))}>Remove row</button></div>
        <div className="mt-2 flex flex-wrap gap-2">{r.cells.map((cell: any, ci: number) => (
          <div key={ci} className="min-w-[180px] flex-1 rounded bg-surface-container-low p-2 text-body-sm" style={{ flexBasis: `${cell.w}%` }}>
            <div className="flex flex-wrap gap-2"><label className="flex items-center gap-1">W %<input type="number" step="0.1" className="field w-16 py-1" value={cell.w} onChange={e => { const n = structuredClone(rows); n[ri].cells[ci].w = +e.target.value; setRows(n); }} /></label>
              <label className="flex items-center gap-1">Fill<select className="field py-1" value={cell.fill || ""} onChange={e => { const n = structuredClone(rows); if (e.target.value) n[ri].cells[ci].fill = e.target.value; else delete n[ri].cells[ci].fill; setRows(n); }}>{fills.map(f => <option key={f} value={f}>{f || "none"}</option>)}</select></label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!cell.image} onChange={e => { const n = structuredClone(rows); n[ri].cells[ci].image = e.target.checked; setRows(n); }} />Photo slot</label>
              <button className="text-error" aria-label="Remove cell" onClick={() => { const n = structuredClone(rows); n[ri].cells.splice(ci, 1); setRows(n); }}>✕</button></div>
            <p className="mt-1 text-on-surface-variant">Items: {(cell.items || []).map((it: any) => it.k).join(", ") || "none"}</p>
          </div>))}</div>
      </li>))}</ol>
    <button className="btn btn-sm" onClick={() => setRows([...rows, { h: 10, cells: [{ w: 100, items: [] }] }])}>+ Row</button>
    <details onToggle={e => setJson((e.target as HTMLDetailsElement).open ? JSON.stringify(c, null, 1) : null)}><summary className="cursor-pointer text-label-md">Edit the full layout as JSON (items, padding, colours)</summary>
      {json !== null && <><textarea className="field mt-2 min-h-[280px] font-mono text-[12px]" value={json} onChange={e => setJson(e.target.value)} aria-label="Cover JSON" />
        <button className="btn btn-sm mt-2" onClick={() => { try { const o = JSON.parse(json); update(o); toast("Layout updated."); } catch (e: any) { toast("That isn't valid JSON: " + e.message); } }}>Apply JSON</button></>}</details>
  </div>);
}

function InsidePreview({ L, t }: { L: any; t: any }) {
  const th = L.theme(t.theme), f = L.font(t.font), st = L.styleOf(t);
  const vars: any = Object.fromEntries(RD.varStyle(th, f).split(";").map((p: string) => [p.slice(0, p.indexOf(":")), p.slice(p.indexOf(":") + 1)]));
  return (<div className="rounded-xl bg-desk p-5"><div className="sheet doc mx-auto max-w-[240px] overflow-hidden" data-chapter={st.chapter} data-table={st.table} data-stat={st.stat} data-callout={st.callout} style={{ ...vars, aspectRatio: "1/1.414", fontSize: 6 }}>
    <div style={{ padding: "10%", zoom: 0.42 } as any}>
      <div className="ch-head"><div className="ch-num">01</div><h2 className="ch-title">{t.sections?.[0]?.title || "Section"}</h2><div className="ch-rule" /></div>
      <div className="b-stats"><div className="b-stat"><div className="v">1,240</div><div className="l">PAPs</div></div><div className="b-stat"><div className="v">18 km</div><div className="l">length</div></div></div>
      <div className="b-call" style={{ marginTop: 12 }}><div className="t">Key message</div><div>Mitigation reduces most impacts to low.</div></div>
      <table className="b-tbl" style={{ marginTop: 12 }}><thead><tr><th>Impact</th><th>After</th></tr></thead><tbody><tr><td>Dust</td><td className="rt" style={{ background: "#3E8E5A" }}>Low</td></tr><tr><td>Access</td><td className="rt" style={{ background: "#E0A030" }}>Moderate</td></tr></tbody></table>
    </div></div><p className="mt-2 text-center text-body-sm text-on-surface-variant">Inside page</p></div>);
}
