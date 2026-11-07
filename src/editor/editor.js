/* editor.js — the report editor, mounted by the React page at /reports/[id].
   mountEditor(root, opts) builds the settings panel and the paper preview, keeps the report model in sync with
   in-place edits, and calls opts.api to save, upload, run AI and log exports. Ported from the original single-page studio.
   opts = {lib, report, draft, ai: {enabled}, templateLimit, api: {...}, navigate(path), onStatus(s)}
   Report model R: {templateId, theme, cover, font, style, meta, images:{key:{path,w,h}}, logo, coverImg, sections:[{title, hint, blocks}]}. */
import Chart from "chart.js/auto";
import { util as U, makeLib, STYLE_OPTIONS, STYLE_LABELS, DEFAULT_STYLE } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { buildDocx, coverSlots } from "@/engine/docx.js";
import { esc, toast, confirmBox, debounce, loadImage, toImageBlob, downloadBlob } from "./ui.js";
import { importText } from "./importers.js";

export const BLOCK_NAMES = {p: "Paragraph", h: "Sub-heading", bullets: "Bullets", stats: "Key figures", callout: "Key message", table: "Table", chart: "Chart", steps: "Process", quote: "Quote", image: "Photo"};

export function mountEditor(root, opts){
  const L = makeLib(opts.lib);
  const api = opts.api;
  const E = {R: opts.report, draft: opts.draft || "", charts: [], aiCtl: null, remaining: null, destroyed: false};
  if(!E.R.images) E.R.images = {};
  if(!E.R.style) E.R.style = L.styleOf(L.tpl(E.R.templateId));
  const q = s => root.querySelector(s);
  const qa = s => Array.from(root.querySelectorAll(s));
  const imgURL = ref => ref ? (ref.path ? "/api/files/" + ref.path.split("/").map(encodeURIComponent).join("/") : ref.src || null) : null;
  const styleOf = R => Object.assign({}, DEFAULT_STYLE, R.style || {});

  /* ---------- Saving ---------- */
  let saving = Promise.resolve();
  const setStatus = s => opts.onStatus && opts.onStatus(s);
  const doSave = () => {
    const snapshot = JSON.parse(JSON.stringify(E.R)); snapshot.sections.forEach(s => (s.blocks || []).forEach(b => delete b._n)); delete snapshot._pendingAny;
    snapshot.sections.forEach(s => delete s._pending);
    setStatus("saving");
    saving = saving.then(() => api.save(snapshot)).then(() => setStatus("saved")).catch(e => { console.warn(e); setStatus("error"); });
    return saving;
  };
  const saveSoon = debounce(doSave, 1200);
  const save = () => { E.R.isExample = false; saveSoon(); };
  const saveDraftSoon = debounce(() => api.saveDraft(E.draft).catch(() => setStatus("error")), 1500);

  /* ---------- Mount ---------- */
  root.innerHTML = `
  <div class="rs-studio">
    <aside class="rs-panel" aria-label="Report settings">
      <section class="rs-pane">
        <h2><span>01 · Template</span></h2>
        <div class="rs-row"><div class="rs-tplname" data-x="tpl-name"></div><button class="rs-link" data-act="new-report">New report</button></div>
        <p class="rs-note" data-x="tpl-desc"></p>
      </section>
      <section class="rs-pane">
        <h2><span>02 · Design</span></h2>
        <span class="rs-lbl">Colour theme</span>
        <div class="rs-swatches" data-x="themes"></div>
        <span class="rs-lbl">Cover</span>
        <div class="rs-covers" data-x="covers"></div>
        <span class="rs-lbl">Typefaces</span>
        <div class="rs-seg" data-x="fonts"></div>
        <div class="rs-two" data-x="styles"></div>
      </section>
      <section class="rs-pane">
        <h2><span>03 · Your draft</span></h2>
        <textarea class="field rs-draft" id="ed-draft" placeholder="Paste your draft report, field notes, tables or data here. Headings, numbers and lists all help."></textarea>
        <div class="rs-actions-row">
          <label class="btn btn-sm rs-file">Import Word, PDF or text<input type="file" id="ed-file-draft" accept=".docx,.pdf,.txt,.md,.csv"></label>
          ${opts.ai.enabled ? `<button class="btn btn-primary btn-sm" id="ed-structure"><span class="icon" aria-hidden="true">auto_awesome</span>Structure with AI</button>` : ""}
          <button class="btn btn-sm" id="ed-stop" hidden>Stop</button>
          <button class="btn btn-sm" id="ed-continue" hidden>Continue</button>
        </div>
        <div class="rs-progress" id="ed-prog" hidden><i></i></div>
        <div class="rs-status" id="ed-ai-status" role="status"></div>
        <p class="rs-note">${opts.ai.enabled ? "AI sorts your draft into the template's sections and turns figures into tables, charts and key-figure tiles. It uses only facts from your draft and marks gaps “To be completed”." : "Paste your draft here to keep it next to the report while you write. Add content to each section with the Add buttons on the page."}</p>
      </section>
      <section class="rs-pane">
        <h2><span>04 · Cover details</span></h2>
        <label class="rs-lbl" for="ed-m-title">Report title</label><input class="field" id="ed-m-title">
        <label class="rs-lbl" for="ed-m-subtitle">Subtitle</label><input class="field" id="ed-m-subtitle">
        <label class="rs-lbl" for="ed-m-docType">Document type</label><input class="field" id="ed-m-docType">
        <div class="rs-two">
          <div><label class="rs-lbl" for="ed-m-client">Prepared for</label><input class="field" id="ed-m-client"></div>
          <div><label class="rs-lbl" for="ed-m-preparedBy">Prepared by</label><input class="field" id="ed-m-preparedBy"></div>
          <div><label class="rs-lbl" for="ed-m-date">Date</label><input class="field" id="ed-m-date"></div>
          <div><label class="rs-lbl" for="ed-m-version">Version / status</label><input class="field" id="ed-m-version"></div>
          <div><label class="rs-lbl" for="ed-m-abbr">Cover abbreviation</label><input class="field" id="ed-m-abbr"></div>
        </div>
        <div class="rs-actions-row">
          <label class="btn btn-sm rs-file">Logo<input type="file" id="ed-file-logo" accept="image/png,image/jpeg"></label>
          <label class="btn btn-sm rs-file">Cover photo<input type="file" id="ed-file-cover" accept="image/png,image/jpeg,image/webp"></label>
          <button class="btn btn-sm btn-ghost" id="ed-clear-imgs">Remove images</button>
        </div>
      </section>
      <section class="rs-pane">
        <h2><span>05 · This report</span></h2>
        <div class="rs-actions-row">
          <button class="btn btn-sm" id="ed-dup">Duplicate</button>
          <button class="btn btn-sm btn-danger" id="ed-delete">Delete</button>
        </div>
      </section>
    </aside>
    <div class="rs-deskwrap">
      <div class="rs-banner" data-x="example-banner" hidden><span>This is an example report with invented figures. Edit it freely, or start your own from a template.</span><button class="btn btn-sm" data-act="new-report">Choose a template</button></div>
      <div class="rs-desk" data-x="desk"></div>
    </div>
  </div>`;

  /* ---------- Panel ---------- */
  function renderPanel(){
    const R = E.R, t = L.tpl(R.templateId);
    q("[data-x=tpl-name]").textContent = t.name; q("[data-x=tpl-desc]").textContent = t.desc || "";
    q("[data-x=themes]").innerHTML = L.lib.themes.map(th => `<button class="rs-sw" data-theme="${esc(th.id)}" aria-pressed="${R.theme === th.id}" title="${esc(th.name)}"><span class="rs-dot" style="background:#${th.primary};box-shadow:inset -9px 0 0 #${th.accent}"></span><small>${esc(th.name)}</small></button>`).join("");
    q("[data-x=covers]").innerHTML = L.lib.covers.map(c => `<button class="rs-sw" data-cover="${esc(c.id)}" aria-pressed="${R.cover === c.id}" title="${esc(c.name)}">${RD.thumb(L, t, {theme: R.theme, font: R.font, cover: c.id, title: " "})}<small>${esc(c.name)}</small></button>`).join("");
    q("[data-x=fonts]").innerHTML = L.lib.fonts.map(f => `<button data-font="${esc(f.id)}" aria-pressed="${R.font === f.id}">${esc(f.name)}</button>`).join("");
    q("[data-x=styles]").innerHTML = Object.keys(STYLE_OPTIONS).map(k => `<div><label class="rs-lbl" for="ed-st-${k}">${esc(STYLE_LABELS[k])}</label><select class="field" id="ed-st-${k}" data-style="${k}">${STYLE_OPTIONS[k].map(o => `<option value="${o[0]}" ${styleOf(R)[k] === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select></div>`).join("");
    ["title", "subtitle", "docType", "client", "preparedBy", "date", "version", "abbr"].forEach(k => { const el = q("#ed-m-" + k); if(el && document.activeElement !== el) el.value = R.meta[k] || ""; });
    const d = q("#ed-draft"); if(document.activeElement !== d) d.value = E.draft;
    q("[data-x=example-banner]").hidden = !R.isExample;
    const cont = q("#ed-continue"); cont.hidden = !(E.remaining && E.remaining.length);
    if(E.remaining && E.remaining.length) cont.textContent = `Continue (${E.remaining.length} sections left)`;
  }
  root.addEventListener("click", e => {
    const th = e.target.closest("[data-theme]"); if(th){ E.R.theme = th.dataset.theme; save(); renderPanel(); renderDoc(); return; }
    const cv = e.target.closest("[data-cover]"); if(cv){ E.R.cover = cv.dataset.cover; save(); renderPanel(); renderDoc(); return; }
    const fo = e.target.closest("[data-font]"); if(fo){ E.R.font = fo.dataset.font; save(); renderPanel(); renderDoc(); return; }
    if(e.target.closest("[data-act=new-report]")){ opts.navigate("/library?pick=1"); return; }
  });
  root.addEventListener("change", e => { const st = e.target.closest("[data-style]"); if(st){ E.R.style = Object.assign(styleOf(E.R), {[st.dataset.style]: st.value}); save(); renderDoc(); } });
  ["title", "subtitle", "docType", "client", "preparedBy", "date", "version", "abbr"].forEach(k => {
    q("#ed-m-" + k).addEventListener("input", e => { E.R.meta[k] = e.target.value; save(); renderCoverSoon(); });
  });
  q("#ed-draft").addEventListener("input", e => { E.draft = e.target.value; saveDraftSoon(); });
  q("#ed-file-draft").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if(!f) return;
    try{ setAIStatus("Reading " + f.name + "…"); E.draft = await importText(f); q("#ed-draft").value = E.draft; saveDraftSoon(); setAIStatus(`Imported ${f.name} (${Math.round(E.draft.length / 1000)}k characters).`); }
    catch(err){ setAIStatus("Couldn't read that file: " + (err.message || "unknown error"), true); }
  });
  q("#ed-file-logo").addEventListener("change", e => pickImage(e.target, "logo"));
  q("#ed-file-cover").addEventListener("change", e => pickImage(e.target, "coverImg"));
  q("#ed-clear-imgs").onclick = () => { E.R.logo = null; E.R.coverImg = null; save(); renderAll(); };
  const sb = q("#ed-structure"); if(sb) sb.onclick = () => structure(false);
  q("#ed-continue").onclick = () => structure(true);
  q("#ed-stop").onclick = () => E.aiCtl && E.aiCtl.abort();
  q("#ed-dup").onclick = async () => { await saveSoon.flush(); await saving; try{ const id = await api.duplicate(); toast("Duplicated. Opening the copy."); opts.navigate("/reports/" + id); }catch(err){ toast(err.message || "Couldn't duplicate."); } };
  q("#ed-delete").onclick = async () => { if(!(await confirmBox("Delete this report?", `“${E.R.meta.title || "Untitled report"}” will be deleted for good.`, "Delete report", "Cancel", true))) return; saveSoon.cancel(); saveDraftSoon.cancel(); await saving; await api.remove(); toast("Report deleted."); opts.navigate("/dashboard"); };
  async function pickImage(input, key){
    const f = input.files[0]; input.value = ""; if(!f) return;
    try{
      toast("Uploading image…", 1500);
      const im = await toImageBlob(f, key === "logo" ? 800 : 2000, key === "logo");
      const ref = await api.uploadImage(im.blob, im.type, im.w, im.h);
      const k = (key === "logo" ? "logo-" : "cover-") + U.uid();
      E.R.images[k] = ref; E.R[key] = k; save(); renderAll();
    }catch(err){ toast("Couldn't use that image: " + (err.message || err)); }
  }

  /* ---------- Document preview ---------- */
  function coverHTML(){
    const R = E.R;
    return RD.cover({def: L.cover(R.cover), theme: L.theme(R.theme), font: L.font(R.font), meta: R.meta, abbr: R.meta.abbr || L.tpl(R.templateId).abbr,
      logo: R.logo ? imgURL(R.images[R.logo]) : null, photo: R.coverImg ? imgURL(R.images[R.coverImg]) : null, editable: true});
  }
  const renderCoverSoon = debounce(() => { const cv = q(".rs-desk > .sheet.cover-sheet"); if(cv) cv.innerHTML = coverHTML(); const di = q(".docinfo"); if(di) di.outerHTML = docInfoHTML(); }, 250);
  function newBlock(t){
    switch(t){
      case "p": return {t, text: ""};
      case "h": return {t, text: "Sub-heading"};
      case "bullets": return {t, items: ["First point", "Second point"]};
      case "stats": return {t, items: [{value: "0", label: "Label"}, {value: "0", label: "Label"}, {value: "0", label: "Label"}]};
      case "callout": return {t, title: "Key message", text: "Write the main takeaway here."};
      case "table": return {t, caption: "Table caption", head: ["Item", "Status", "Comment"], rows: [["", "", ""], ["", "", ""]], rating: null};
      case "chart": return {t, kind: "column", title: "Chart title", unit: "", labels: ["A", "B", "C"], series: [{name: "Series 1", values: [3, 5, 4]}]};
      case "steps": return {t, title: "Process", items: [{title: "Step one", text: ""}, {title: "Step two", text: ""}, {title: "Step three", text: ""}]};
      case "quote": return {t, text: "Quote text", by: "Speaker, context"};
      case "image": return {t, caption: "Photo caption"};
    }
  }
  function blockHTML(b, si, bi){
    const P = `sections.${si}.blocks.${bi}`;
    const Ed = (path, html, tag = "div", cls = "", ph = "") => `<${tag} class="${cls}" contenteditable="true" data-path="${P}${path ? "." + path : ""}" data-ph="${esc(ph)}">${html}</${tag}>`;
    let extra = "", inner = "";
    const cap = (kind, num, path, text) => `<div class="cap"><span>${kind} ${si + 1}.${num}</span> &nbsp;${Ed(path, esc(text), "span", "", "Caption")}</div>`;
    switch(b.t){
      case "p": inner = Ed("text", U.md(b.text), "p", "", "Type a paragraph"); break;
      case "h": inner = Ed("text", esc(b.text), "div", "b-h", "Sub-heading"); break;
      case "bullets": inner = `<ul class="b-ul" contenteditable="true" data-list="${P}.items">${(b.items || []).map(i => `<li>${U.md(i)}</li>`).join("")}</ul>`; break;
      case "stats": inner = `<div class="b-stats">${(b.items || []).map((s, i) => `<div class="b-stat">${Ed(`items.${i}.value`, esc(s.value), "div", "v", "0")}${Ed(`items.${i}.label`, esc(s.label), "div", "l", "Label")}</div>`).join("")}</div>`;
        extra = `<button data-act="add-item">+ Figure</button><button data-act="del-item">− Figure</button>`; break;
      case "callout": inner = `<div class="b-call">${Ed("title", esc(b.title), "div", "t", "Title")}${Ed("text", U.md(b.text), "div", "", "Text")}</div>`; break;
      case "table": {
        const ncol = Math.max((b.head || []).length, ...(b.rows || []).map(r => r.length), 1);
        inner = cap("Table", b._n, "caption", b.caption) + `<div class="tbl-wrap"><table class="b-tbl"><thead><tr>${Array.from({length: ncol}, (_, c) => `<th>${Ed(`head.${c}`, esc((b.head || [])[c] ?? ""), "div", "", "Header")}</th>`).join("")}</tr></thead><tbody>${(b.rows || []).map((r, ri) => `<tr>${Array.from({length: ncol}, (_, c) => { const v = r[c] ?? ""; const rc = b.rating === c ? U.ratingColor(v) : null; return `<td class="${rc ? "rt" : ""}" style="${rc ? `background:#${rc}` : ""}">${Ed(`rows.${ri}.${c}`, U.md(v), "div")}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
        extra = `<button data-act="add-row">+ Row</button><button data-act="del-row">− Row</button><button data-act="add-col">+ Col</button><button data-act="del-col">− Col</button><select data-act="rating" aria-label="Colour-code a column"><option value="">No colour coding</option>${Array.from({length: ncol}, (_, c) => `<option value="${c}" ${b.rating === c ? "selected" : ""}>Colour: ${esc((b.head || [])[c] || "Col " + (c + 1))}</option>`).join("")}</select>`;
        break;
      }
      case "chart": {
        inner = cap("Figure", b._n, "title", b.title) + `<div class="b-chart"><canvas data-chart="${si}.${bi}" role="img" aria-label="${esc(b.title)}"></canvas></div><div class="chart-ed" hidden><textarea aria-label="Chart data">${esc(chartCSV(b))}</textarea><div class="note">First row: label column, then one column per series. Unit: <input data-unit value="${esc(b.unit || "")}" aria-label="Unit"></div></div>`;
        extra = `<select data-act="kind" aria-label="Chart type">${["column", "bar", "line", "pie", "doughnut"].map(k => `<option ${b.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select><button data-act="edit-data">Edit data</button>`;
        break;
      }
      case "steps": inner = (b.title ? cap("Figure", b._n, "title", b.title) : "") + `<div class="b-steps">${(b.items || []).map((s, i) => `<div class="b-step"><div class="n">${U.pad2(i + 1)}</div>${Ed(`items.${i}.title`, esc(s.title), "div", "t", "Step")}${Ed(`items.${i}.text`, U.md(s.text), "div", "x", "Description")}</div>`).join("")}</div>`;
        extra = `<button data-act="add-item">+ Step</button><button data-act="del-item">− Step</button>`; break;
      case "quote": inner = `<div class="b-quote">${Ed("text", esc(b.text), "div", "q", "Quote")}${Ed("by", esc(b.by), "div", "by", "Speaker")}</div>`; break;
      case "image": {
        const url = b.src && E.R.images[b.src] ? imgURL(E.R.images[b.src]) : null;
        inner = `<div class="b-img">${url ? `<img src="${esc(url)}" alt="${esc(b.caption)}">` : `<div class="ph">Photo placeholder<br>Use “Upload photo” above</div>`}${Ed("caption", esc(b.caption), "div", "ic", "Caption")}</div>`;
        extra = `<label>Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" data-act="photo"></label>`; break;
      }
      default: inner = `<p style="color:#7b8781">Unknown block type "${esc(b.t)}"</p>`;
    }
    return `<div class="blk" data-si="${si}" data-bi="${bi}"><div class="btools"><span class="tag">${BLOCK_NAMES[b.t] || esc(b.t)}</span>${extra}<button data-act="up" aria-label="Move up">↑</button><button data-act="down" aria-label="Move down">↓</button><button data-act="del" aria-label="Delete block">✕</button></div>${inner}</div>`;
  }
  function chartCSV(b){
    const head = ["Label", ...(b.series || []).map(s => s.name)].join(", ");
    return [head, ...(b.labels || []).map((l, i) => [l, ...(b.series || []).map(s => s.values[i] ?? "")].join(", "))].join("\n");
  }
  function parseCSV(txt){
    const lines = txt.split(/\n/).map(l => l.split(",").map(x => x.trim())).filter(r => r.some(Boolean));
    if(lines.length < 2) return null;
    const names = lines[0].slice(1);
    return {labels: lines.slice(1).map(r => r[0]), series: names.map((n, i) => ({name: n || `Series ${i + 1}`, values: lines.slice(1).map(r => { const v = parseFloat(String(r[i + 1] || "").replace(/[^0-9.\-]/g, "")); return isNaN(v) ? null : v; })}))};
  }
  const docAttrs = () => { const st = styleOf(E.R); return `data-chapter="${st.chapter}" data-table="${st.table}" data-stat="${st.stat}" data-callout="${st.callout}"`; };
  function sectionHTML(sec, si){
    let t = 0, f = 0;
    (sec.blocks || []).forEach(b => { if(b.t === "table") b._n = ++t; else if(b.t === "chart" || (b.t === "steps" && b.title)) b._n = ++f; });
    const body = sec._pending ? `<div class="pending">Writing this section…</div>`
      : (sec.blocks && sec.blocks.length ? sec.blocks.map((b, bi) => blockHTML(b, si, bi)).join("") : `<p class="empty-sec">Empty. ${esc(sec.hint || "")}</p>`);
    return `<article class="sheet doc chapter" ${docAttrs()} data-sec="${si}">
      <div class="sec-tools">${opts.ai.enabled ? `<button class="btn btn-sm" data-sact="refine">Refine with AI</button>` : ""}<button class="btn btn-sm" data-sact="remove">Remove</button></div>
      <div class="ch-head"><div class="ch-num">${U.pad2(si + 1)}</div><h2 class="ch-title" contenteditable="true" data-path="sections.${si}.title" data-ph="Section title">${esc(sec.title)}</h2><div class="ch-rule"></div></div>
      <div class="refine" hidden>
        <label for="ri-${si}" class="refine-l">What should change in this section?</label>
        <div class="refine-chips">${["Write this section from my draft", "Turn the figures into a chart", "Add key-figure tiles", "Make it more concise", "Turn lists into a table", "Add a process diagram"].map(c => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        <input id="ri-${si}" placeholder="e.g. Summarise the consultation findings in a table">
        <div class="refine-row"><button class="btn btn-sm btn-primary" data-sact="run">Apply</button><button class="btn btn-sm" data-sact="cancel">Close</button><span class="msg" role="status"></span></div>
      </div>
      ${body}
      <div class="addrow"><span>Add</span>${Object.entries(BLOCK_NAMES).map(([k, n]) => `<button data-add="${k}">${n}</button>`).join("")}</div>
    </article>`;
  }
  function docInfoHTML(){
    const m = E.R.meta;
    const rows = [["Document", m.title], ["Document type", m.docType], ["Prepared for", m.client], ["Prepared by", m.preparedBy], ["Date", m.date], ["Version / status", m.version]].filter(r => r[1]);
    return `<article class="sheet doc docinfo"><h2>Document information</h2><table>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</table>
      <div class="toc"><h2>Contents</h2>${E.R.sections.map((s, i) => `<div><b>${U.pad2(i + 1)}</b><span>${esc(s.title)}</span></div>`).join("")}<div class="hint">Word builds the page-numbered contents list when the file opens.</div></div></article>`;
  }
  function renderDoc(){
    E.charts.forEach(c => { try{ c.destroy(); }catch(e){} }); E.charts = [];
    const desk = q("[data-x=desk]"); const R = E.R;
    RD.setVars(desk, L.theme(R.theme), L.font(R.font));
    desk.innerHTML = `<article class="sheet cover-sheet">${coverHTML()}</article>${docInfoHTML()}${R.sections.map(sectionHTML).join("")}<button class="btn" id="ed-addsec">+ Add section</button>`;
    drawCharts();
  }
  function replaceSection(i){ const el = q(`[data-sec="${i}"]`); if(!el) return; el.outerHTML = sectionHTML(E.R.sections[i], i); drawCharts(); }
  function drawCharts(){
    const th = L.theme(E.R.theme), f = L.font(E.R.font);
    qa("canvas[data-chart]").forEach(cv => {
      if(cv._drawn) return; cv._drawn = true;
      const [si, bi] = cv.dataset.chart.split(".").map(Number); const b = E.R.sections[si] && E.R.sections[si].blocks[bi]; if(!b) return;
      const series = (b.series || []).filter(s => s && s.values); const cols = U.seriesColors(th, Math.max(series.length, (b.labels || []).length)).map(c => "#" + c);
      const pie = b.kind === "pie" || b.kind === "doughnut";
      const ds = pie ? [{label: series[0] && series[0].name, data: (series[0] && series[0].values) || [], backgroundColor: (b.labels || []).map((_, i) => cols[i]), borderColor: "#fff", borderWidth: 2}]
        : series.map((s, i) => ({label: s.name, data: s.values, backgroundColor: cols[i], borderColor: cols[i], borderWidth: b.kind === "line" ? 3 : 0, tension: .25, pointRadius: b.kind === "line" ? 4 : 0, borderRadius: 2, maxBarThickness: 46}));
      try{
        E.charts.push(new Chart(cv, {type: pie ? b.kind : (b.kind === "line" ? "line" : "bar"), data: {labels: b.labels || [], datasets: ds},
          options: {responsive: true, maintainAspectRatio: false, animation: false, indexAxis: b.kind === "bar" ? "y" : "x",
            plugins: {legend: {display: pie || series.length > 1, position: pie ? "right" : "bottom", labels: {font: {family: f.cssBody, size: 12}, color: "#333", boxWidth: 12}}},
            scales: pie ? {} : {x: {grid: {display: b.kind === "bar"}, ticks: {font: {family: f.cssBody}, color: "#555"}}, y: {grid: {color: "#e6e6e6", display: b.kind !== "bar"}, ticks: {font: {family: f.cssBody}, color: "#555"}, beginAtZero: true, title: {display: !!b.unit, text: b.unit || "", color: "#555"}}}}}));
      }catch(e){ console.warn(e); }
    });
  }
  function renderAll(){ renderPanel(); renderDoc(); }

  /* ---------- Editing in the preview ---------- */
  function setPath(obj, path, val){ const k = path.split("."); let o = obj; for(let i = 0; i < k.length - 1; i++){ o = o[k[i]]; if(o == null) return; } o[k[k.length - 1]] = val; }
  function editableToMd(el){
    const c = el.cloneNode(true);
    c.querySelectorAll("strong,b").forEach(b => b.replaceWith("**" + b.textContent + "**"));
    c.querySelectorAll("br").forEach(b => b.replaceWith(" "));
    return c.textContent.replace(/ /g, " ").replace(/\*\*\s*\*\*/g, "").trim();
  }
  function commit(){ save(); renderAll(); }
  const desk = q("[data-x=desk]");
  desk.addEventListener("input", e => {
    const el = e.target.closest("[contenteditable]"); if(!el) return;
    if(el.dataset.meta){ E.R.meta[el.dataset.meta] = el.textContent.trim(); const f = q("#ed-m-" + el.dataset.meta); if(f) f.value = E.R.meta[el.dataset.meta]; }
    else if(el.dataset.list){ setPath(E.R, el.dataset.list, Array.from(el.querySelectorAll("li")).map(editableToMd).filter(Boolean)); }
    else if(el.dataset.path){ setPath(E.R, el.dataset.path, editableToMd(el)); }
    save();
  });
  desk.addEventListener("focusout", e => {
    const el = e.target.closest("[data-path]"); if(!el) return;
    const m = el.dataset.path.match(/^sections\.(\d+)\.blocks\.(\d+)\.rows\.\d+\.(\d+)$/);
    if(m){ const b = E.R.sections[m[1]].blocks[m[2]]; if(b && b.rating === +m[3]){ const td = el.closest("td"); const rc = U.ratingColor(editableToMd(el)); td.className = rc ? "rt" : ""; td.style.background = rc ? "#" + rc : ""; } }
    if(/^sections\.\d+\.title$/.test(el.dataset.path)){ const di = q(".docinfo"); if(di) di.outerHTML = docInfoHTML(); }
  });
  desk.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.closest("[data-path],[data-meta]") && !e.shiftKey && !e.target.closest("[data-list]")){ e.preventDefault(); e.target.blur(); } });
  desk.addEventListener("paste", e => { const el = e.target.closest("[contenteditable]"); if(!el) return; e.preventDefault(); const txt = (e.clipboardData || window.clipboardData).getData("text/plain"); document.execCommand("insertText", false, txt); });
  desk.addEventListener("click", async e => {
    if(e.target.id === "ed-addsec"){ E.R.sections.push({title: "New section", hint: "", blocks: []}); commit(); return; }
    const add = e.target.closest("[data-add]");
    if(add){ const si = +add.closest("[data-sec]").dataset.sec; E.R.sections[si].blocks.push(newBlock(add.dataset.add)); commit(); return; }
    const chip = e.target.closest("[data-chip]");
    if(chip){ const box = chip.closest(".refine"); box.querySelector("input").value = chip.dataset.chip; box.querySelector("input").focus(); return; }
    const sact = e.target.closest("[data-sact]");
    if(sact){
      const art = sact.closest("[data-sec]"); const si = +art.dataset.sec; const box = art.querySelector(".refine"); const a = sact.dataset.sact;
      if(a === "refine"){ box.hidden = !box.hidden; if(!box.hidden) box.querySelector("input").focus(); }
      if(a === "cancel") box.hidden = true;
      if(a === "remove"){ if(await confirmBox("Remove this section?", `“${E.R.sections[si].title}” and its content will be deleted.`, "Remove", "Cancel", true)){ E.R.sections.splice(si, 1); commit(); } }
      if(a === "run") refineSection(si, box);
      return;
    }
    const act = e.target.closest("[data-act]");
    if(act && act.tagName === "BUTTON"){
      const blk = act.closest(".blk"); if(!blk) return;
      const si = +blk.dataset.si, bi = +blk.dataset.bi; const list = E.R.sections[si].blocks; const b = list[bi];
      switch(act.dataset.act){
        case "up": if(bi > 0) [list[bi - 1], list[bi]] = [list[bi], list[bi - 1]]; break;
        case "down": if(bi < list.length - 1) [list[bi + 1], list[bi]] = [list[bi], list[bi + 1]]; break;
        case "del": list.splice(bi, 1); break;
        case "add-item": b.items.push(b.t === "stats" ? {value: "0", label: "Label"} : {title: "Step", text: ""}); break;
        case "del-item": if(b.items.length > 1) b.items.pop(); break;
        case "add-row": b.rows.push(Array((b.head || []).length || 1).fill("")); break;
        case "del-row": if(b.rows.length > 1) b.rows.pop(); break;
        case "add-col": b.head.push("New column"); b.rows.forEach(r => r.push("")); break;
        case "del-col": if(b.head.length > 1){ b.head.pop(); b.rows.forEach(r => r.pop()); if(b.rating >= b.head.length) b.rating = null; } break;
        case "edit-data": { const ed = blk.querySelector(".chart-ed"); ed.hidden = !ed.hidden; return; }
        default: return;
      }
      commit();
    }
  });
  desk.addEventListener("change", async e => {
    const blk = e.target.closest(".blk"); if(!blk) return;
    const b = E.R.sections[+blk.dataset.si].blocks[+blk.dataset.bi];
    if(e.target.closest(".chart-ed")){
      if(e.target.matches("textarea")){ const p = parseCSV(e.target.value); if(p){ b.labels = p.labels; b.series = p.series; commit(); } else toast("Add a header row and at least one data row."); }
      if(e.target.matches("[data-unit]")){ b.unit = e.target.value; commit(); }
      return;
    }
    const act = e.target.closest("[data-act]"); if(!act) return;
    if(act.dataset.act === "kind"){ b.kind = act.value; commit(); }
    if(act.dataset.act === "rating"){ b.rating = act.value === "" ? null : +act.value; commit(); }
    if(act.dataset.act === "photo" && act.files[0]){
      try{ toast("Uploading photo…", 1500); const im = await toImageBlob(act.files[0], 1800); const ref = await api.uploadImage(im.blob, im.type, im.w, im.h); const k = "img-" + U.uid(); E.R.images[k] = ref; b.src = k; commit(); }
      catch(err){ toast("Couldn't use that photo: " + (err.message || err)); }
    }
  });

  /* ---------- Word export ---------- */
  async function bytesOf(ref){
    const r = await fetch(imgURL(ref)); if(!r.ok) throw new Error("An image could not be loaded for export.");
    const data = new Uint8Array(await r.arrayBuffer()); const type = (r.headers.get("content-type") || "").includes("png") ? "png" : "jpg";
    return {data, type};
  }
  async function cropTo(url, w, h){
    const i = await loadImage(url);
    const c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w * 2)); c.height = Math.max(2, Math.round(h * 2));
    const s = Math.max(c.width / i.naturalWidth, c.height / i.naturalHeight); const dw = i.naturalWidth * s, dh = i.naturalHeight * s;
    c.getContext("2d").drawImage(i, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.86));
    return {type: "jpg", data: new Uint8Array(await blob.arrayBuffer()), w, h};
  }
  async function prepareAssets(R){
    const a = {images: {}, coverSlots: {}, logo: null};
    const logoRef = R.logo && R.images[R.logo];
    if(logoRef){ a.logo = Object.assign(await bytesOf(logoRef), {w: logoRef.w || 300, h: logoRef.h || 100}); }
    const photoRef = R.coverImg && R.images[R.coverImg];
    if(photoRef){ const url = imgURL(photoRef); for(const s of coverSlots(L.cover(R.cover))) a.coverSlots[s.key] = await cropTo(url, s.w, s.h); }
    for(const sec of R.sections) for(const b of (sec.blocks || [])){
      if(b.t === "image" && b.src && R.images[b.src] && !a.images[b.src]){ const ref = R.images[b.src]; a.images[b.src] = Object.assign(await bytesOf(ref), {w: ref.w || 1200, h: ref.h || 800}); }
    }
    return a;
  }
  const slug = () => (E.R.meta.title || L.tpl(E.R.templateId).abbr || "report").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "report";
  async function exportWord(options){
    const docx = await import("docx"); const DC = await import("docx/charts");
    const clean = JSON.parse(JSON.stringify(E.R)); clean.sections.forEach(s => (s.blocks || []).forEach(b => delete b._n));
    const doc = buildDocx(L, clean, await prepareAssets(clean), docx, DC, {docInfo: !options || options.docInfo !== false, contents: !options || options.contents !== false});
    const blob = await docx.Packer.toBlob(doc);
    const name = ((options && options.filename) || slug()).replace(/\.docx$/i, "") + ".docx";
    downloadBlob(name, blob);
    api.logExport && api.logExport(E.R.templateId).catch(() => {});
    return name;
  }

  /* ---------- AI (prompts are built on the server) ---------- */
  function setAIStatus(msg, err){ const s = q("#ed-ai-status"); if(!s) return; s.textContent = msg || ""; s.classList.toggle("err", !!err); }
  function setProgress(done, total){ const p = q("#ed-prog"); p.hidden = !total; if(total) p.querySelector("i").style.width = Math.round(done / total * 100) + "%"; }
  function cleanBlock(b){
    if(!b || typeof b !== "object") return null; const t = b.t || b.type; const s = v => v == null ? "" : String(v);
    switch(t){
      case "p": case "h": return b.text ? {t, text: s(b.text)} : null;
      case "bullets": return Array.isArray(b.items) && b.items.length ? {t, items: b.items.map(s)} : null;
      case "stats": return Array.isArray(b.items) && b.items.length ? {t, items: b.items.slice(0, 8).map(x => ({value: s(x.value), label: s(x.label)}))} : null;
      case "callout": return {t, title: s(b.title), text: s(b.text)};
      case "table": if(!Array.isArray(b.rows)) return null; return {t, caption: s(b.caption), head: (b.head || []).map(s), rows: b.rows.filter(Array.isArray).map(r => r.map(s)), rating: Number.isInteger(b.rating) ? b.rating : null};
      case "chart": if(!Array.isArray(b.labels) || !Array.isArray(b.series)) return null; return {t, kind: ["column", "bar", "line", "pie", "doughnut"].includes(b.kind) ? b.kind : "column", title: s(b.title), unit: s(b.unit), labels: b.labels.map(s), series: b.series.filter(x => x && Array.isArray(x.values)).map(x => ({name: s(x.name), values: x.values.map(v => { const n = parseFloat(v); return isNaN(n) ? null : n; })}))};
      case "steps": return Array.isArray(b.items) && b.items.length ? {t, title: s(b.title), items: b.items.map(x => ({title: s(x.title), text: s(x.text)}))} : null;
      case "quote": return b.text ? {t, text: s(b.text), by: s(b.by)} : null;
      case "image": return {t, caption: s(b.caption), src: b.src && E.R.images[b.src] ? b.src : undefined};
    }
    return null;
  }
  async function structure(onlyRemaining){
    if(!E.draft.trim()){ setAIStatus("Paste or import your draft first.", true); return; }
    const t = L.tpl(E.R.templateId);
    let targets;
    if(onlyRemaining && E.remaining){ targets = E.remaining; }
    else{
      const has = !E.R.isExample && E.R.sections.some(s => s.blocks && s.blocks.length);
      if(has && !(await confirmBox("Replace the current content?", "AI will rebuild every section from your draft. Edits you made in the preview will be lost. Duplicate the report first if you want to keep this version.", "Rebuild report"))) return;
      E.R.sections = t.sections.map(s => ({title: s.title, hint: s.hint || "", blocks: [], _pending: true}));
      targets = E.R.sections.map((s, i) => ({i, title: s.title, hint: s.hint}));
    }
    targets.forEach(x => { if(E.R.sections[x.i]) E.R.sections[x.i]._pending = true; });
    E.remaining = null; E.R.isExample = false; renderAll();
    E.aiCtl = new AbortController();
    const sbtn = q("#ed-structure"); if(sbtn) sbtn.disabled = true; q("#ed-stop").hidden = false; q("#ed-continue").hidden = true;
    setAIStatus(E.draft.length > 170000 ? "The draft is very long; the first 170,000 characters are used. Reading…" : "Reading your draft… this can take a minute or two.");
    let pending = "", k = 0; setProgress(0, targets.length);
    const eat = line => {
      line = line.trim().replace(/^```(json)?|```$/g, ""); if(!line) return;
      let o; try{ o = JSON.parse(line); }catch(_){ return; }
      if(o.error){ setAIStatus(o.error, true); return; }
      if(o.meta){ if(!E.R.meta.title) E.R.meta.title = String(o.meta.title || ""); if(!E.R.meta.subtitle) E.R.meta.subtitle = String(o.meta.subtitle || ""); renderPanel(); renderCoverSoon(); return; }
      if(Array.isArray(o.blocks) && k < targets.length){
        const target = targets[k++]; const sec = E.R.sections[target.i]; if(!sec) return;
        sec.blocks = o.blocks.map(cleanBlock).filter(Boolean); delete sec._pending;
        setProgress(k, targets.length); setAIStatus(`Structured ${k} of ${targets.length} sections…`);
        replaceSection(target.i); save();
      }
    };
    let msg = null;
    try{
      await api.structure({templateId: E.R.templateId, docType: t.docType, draft: E.draft, onlyRemaining: !!onlyRemaining, sections: targets.map(x => ({title: x.title, hint: x.hint}))},
        {signal: E.aiCtl.signal, onText: delta => { const lines = (pending + delta).split("\n"); pending = lines.pop(); lines.forEach(eat); }});
      if(pending.trim()) eat(pending);
    }catch(e){
      if(pending.trim()) eat(pending);
      msg = e.name === "AbortError" ? "Stopped." : (e.message || "Something interrupted the AI. Try again.");
    }
    targets.slice(k).forEach(x => { if(E.R.sections[x.i]) delete E.R.sections[x.i]._pending; });
    E.remaining = k < targets.length ? targets.slice(k) : null;
    if(sbtn) sbtn.disabled = false; q("#ed-stop").hidden = true; setProgress(0, 0);
    setAIStatus(msg || (E.remaining ? `Structured ${k} of ${targets.length} sections. Choose Continue for the rest.` : `Done. ${k} sections structured. Review, edit in place, then download Word.`), !!msg && msg !== "Stopped.");
    save(); renderAll();
  }
  async function refineSection(si, box){
    const instr = box.querySelector("input").value.trim(); const msg = box.querySelector(".msg"); const runBtn = box.querySelector('[data-sact="run"]');
    if(!instr){ msg.textContent = "Choose a suggestion or type an instruction."; return; }
    const sec = E.R.sections[si]; const t = L.tpl(E.R.templateId);
    runBtn.disabled = true; msg.textContent = "Working… usually under a minute.";
    try{
      const o = await api.refine({templateId: E.R.templateId, docType: t.docType, title: E.R.meta.title || "", instruction: instr, hint: sec.hint || sec.title,
        section: {title: sec.title, blocks: (sec.blocks || []).map(b => { const c = Object.assign({}, b); delete c._n; return c; })}, draft: E.draft.slice(0, 90000)});
      if(!o || !Array.isArray(o.blocks)) throw new Error("The answer came back in the wrong format. Try again.");
      sec.blocks = o.blocks.map(cleanBlock).filter(Boolean);
      if(o.title) sec.title = String(o.title);
      commit(); toast(`Updated “${sec.title}”.`);
    }catch(e){ msg.textContent = e.message || "Something went wrong."; runBtn.disabled = false; }
  }

  renderAll();
  return {
    exportWord,
    get filename(){ return slug(); },
    flush: async () => { await saveSoon.flush(); await saveDraftSoon.flush(); await saving; },
    destroy: () => { E.destroyed = true; saveSoon.flush(); saveDraftSoon.flush(); E.charts.forEach(c => { try{ c.destroy(); }catch(e){} }); root.innerHTML = ""; },
    get report(){ return E.R; }
  };
}
