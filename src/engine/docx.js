/* engine/docx.js — builds the Word document for a report with the "docx" library.
   build(L, R, assets, docx, docxCharts) -> docx.Document. L = makeLib(library). Assets: {logo, coverSlots, images}.
   coverSlots(coverDef) lists the photo slots the caller should crop the cover photo to. */
import { util, color } from "./library.js";
import RD from "./render.js";
const X = {};
const PAGE_W = 11906, PAGE_H = 16838, MAR = 1134, CW = PAGE_W - 2 * MAR;
const TW_PER_PT = 20, PX_PER_TW = 1 / 15;
X.PAGE = {PAGE_W, PAGE_H, MAR, CW};

/* Image slots on a cover, so the editor can crop the cover photo to each: [{key, w, h}] in pixels. */
X.coverSlots = def => {
  const out = []; const hScale = coverHScale(def);
  (def.rows || []).forEach((r, ri) => (r.cells || []).forEach((c, ci) => {
    const wTw = c.w / 100 * PAGE_W, hTw = r.h / 100 * PAGE_H * hScale;
    if(c.image) out.push({key: `r${ri}c${ci}`, w: Math.round(wTw * PX_PER_TW), h: Math.round(hTw * PX_PER_TW) - 1});
    (c.items || []).forEach((it, ii) => { if(it.k === "photo"){ const pad = c.pad || [0, 0, 0, 0]; const w = (c.w - pad[1] - pad[3]) / 100 * PAGE_W; out.push({key: `r${ri}c${ci}i${ii}`, w: Math.round(w * PX_PER_TW), h: Math.round((it.h || 25) / 100 * PAGE_H * PX_PER_TW)}); } });
  }));
  return out;
};
function coverHScale(def){ const sum = (def.rows || []).reduce((a, r) => a + r.h, 0) / 100 * PAGE_H; return sum > 16700 ? 16700 / sum : 1; }

X.build = function(L, m, assets, D, DC, opts){
  assets = assets || {};
  const th = L.theme(m.theme), F = L.font(m.font), st = L.styleOf(m);
  const P = th.primary, Sx = th.secondary, A = th.accent, T = th.tint, K = th.dark;
  const meta = m.meta || {};
  const INK = "2B2B2B", MUTED = "6B6B6B";
  const NONE = {style: D.BorderStyle.NONE, size: 0, color: "FFFFFF"};
  const NB = {top: NONE, bottom: NONE, left: NONE, right: NONE};
  const TNB = {top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE};
  const line = (sz, color, style) => ({style: style || D.BorderStyle.SINGLE, size: sz, color});
  const AUTO = D.LineRuleType.AUTO;

  const run = (text, o = {}) => new D.TextRun({text: String(text ?? ""), font: o.font || F.body, size: o.size || 21, color: o.color || INK, bold: !!o.bold, italics: !!o.italics, characterSpacing: o.cs, allCaps: o.caps});
  const runs = (text, o = {}) => {
    const parts = String(text ?? "").split(/(\*\*[^*]+\*\*)/g).filter(x => x !== "");
    if(!parts.length) return [run("", o)];
    return parts.map(p => /^\*\*[^*]+\*\*$/.test(p) ? run(p.slice(2, -2), Object.assign({}, o, {bold: true})) : run(p, o));
  };
  const para = (children, o = {}) => new D.Paragraph({children, spacing: {before: o.before ?? 0, after: o.after ?? 120, line: o.line ?? 288, lineRule: o.lineRule || AUTO}, alignment: o.align, keepNext: o.keepNext, keepLines: o.keepLines, pageBreakBefore: o.pbb, indent: o.indent, border: o.border, heading: o.heading, numbering: o.numbering});
  const tiny = () => para([run("", {size: 2})], {after: 0, line: 40, lineRule: D.LineRuleType.EXACT});
  const cell = (children, o = {}) => new D.TableCell({children: (children && children.length) ? children : [tiny()],
    width: o.w ? {size: o.w, type: D.WidthType.DXA} : undefined,
    shading: o.fill ? {fill: o.fill, type: D.ShadingType.CLEAR, color: "auto"} : undefined,
    margins: o.m || {top: 100, bottom: 100, left: 140, right: 140}, verticalAlign: o.va, borders: o.borders || NB, columnSpan: o.span});
  const table = (rows, widths, o = {}) => new D.Table({rows, columnWidths: widths, width: {size: widths.reduce((a, b) => a + b, 0), type: D.WidthType.DXA}, layout: D.TableLayoutType.FIXED, borders: o.borders || TNB});
  const row = (children, o = {}) => new D.TableRow({children, height: o.h ? {value: o.h, rule: o.exact ? D.HeightRule.EXACT : D.HeightRule.ATLEAST} : undefined, tableHeader: o.header, cantSplit: o.cantSplit});
  const img = (a, w, h) => new D.ImageRun({type: a.type, data: a.data, transformation: {width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h))}});
  const spacer = after => para([run("", {size: 4})], {after: after ?? 160, line: 240});
  const align = a => a === "center" ? D.AlignmentType.CENTER : a === "right" ? D.AlignmentType.RIGHT : undefined;

  /* ---------- Cover (from the library's cover layout) ---------- */
  function coverChildren(){
    const def = L.cover(m.cover);
    const hScale = coverHScale(def);
    const col = ref => color(ref, th);
    const M = RD.M;
    /* Column grid = every cell edge across all rows. */
    const cuts = [0, 100];
    def.rows.forEach(r => { let x = 0; r.cells.forEach(c => { x += Number(c.w) || 0; cuts.push(Math.min(100, Math.round(x * 100) / 100)); }); });
    const xs = Array.from(new Set(cuts)).sort((a, b) => a - b).filter((x, i, arr) => i === 0 || x - arr[i - 1] > 0.25 || x === 100);
    if(xs.length > 2 && xs[xs.length - 1] - xs[xs.length - 2] <= 0.25) xs.splice(xs.length - 2, 1);
    const edgesTw = xs.map((x, i) => i === xs.length - 1 ? PAGE_W : Math.round(x / 100 * PAGE_W));
    const grid = []; for(let i = 1; i < edgesTw.length; i++) grid.push(edgesTw[i] - edgesTw[i - 1]);
    const nearest = x => { let bi = 0, bd = 1e9; xs.forEach((v, i) => { const d = Math.abs(v - x); if(d < bd){ bd = d; bi = i; } }); return bi; };

    const rows = def.rows.map((r, ri) => {
      const hTw = Math.round(r.h / 100 * PAGE_H * hScale);
      let x = 0;
      const cells = r.cells.map((c, ci) => {
        const x0 = x; x += Number(c.w) || 0;
        const i0 = nearest(x0), i1 = Math.max(i0 + 1, nearest(x));
        const wTw = grid.slice(i0, i1).reduce((a, b) => a + b, 0);
        const pad = (c.pad || [0, 0, 0, 0]).map(p => Math.round(p / 100 * PAGE_W));
        const va = c.v === "bottom" ? D.VerticalAlign.BOTTOM : c.v === "center" ? D.VerticalAlign.CENTER : D.VerticalAlign.TOP;
        const slot = assets.coverSlots && assets.coverSlots[`r${ri}c${ci}`];
        if(c.image && slot){
          return cell([para([img(slot, wTw * PX_PER_TW, hTw * PX_PER_TW - 1)], {after: 0, line: 240})], {w: wTw, span: i1 - i0 > 1 ? i1 - i0 : undefined, fill: c.fill ? col(c.fill) : undefined, va: D.VerticalAlign.TOP, m: {top: 0, bottom: 0, left: 0, right: 0}});
        }
        const availPt = (wTw - pad[1] - pad[3]) / TW_PER_PT;
        const kids = [];
        (c.items || []).forEach((it, ii) => {
          const color = it.color ? col(it.color) : INK; const al = align(it.align);
          switch(it.k){
            case "logo": if(assets.logo){ const hPx = (it.size || M.logo.size) * 4 / 3; let wPx = assets.logo.w / assets.logo.h * hPx; const maxW = availPt * 4 / 3 * 0.9; let hh = hPx; if(wPx > maxW){ hh = hPx * maxW / wPx; wPx = maxW; } kids.push(para([img(assets.logo, wPx, hh)], {after: M.logo.after * TW_PER_PT, line: 240, align: al})); } break;
            case "eyebrow": if(meta.docType) kids.push(para([run(String(meta.docType).toUpperCase(), {color, bold: true, size: (it.size || M.eyebrow.size) * 2, cs: 40})], {after: M.eyebrow.after * TW_PER_PT, line: 276, align: al})); break;
            case "title": kids.push(para([run(meta.title || "Untitled report", {font: F.head, size: Math.round((it.size || M.title.size) * 2), color, bold: F.headBold})], {after: M.title.after * TW_PER_PT, line: 250, align: al})); break;
            case "subtitle": if(meta.subtitle) kids.push(para([run(meta.subtitle, {size: Math.round((it.size || M.subtitle.size) * 2), color})], {after: M.subtitle.after * TW_PER_PT, line: 300, align: al})); break;
            case "client": if(meta.client) kids.push(para([run("Prepared for ", {size: (it.size || M.client.size) * 2, color}), run(meta.client, {size: (it.size || M.client.size) * 2, color: RD.strongColor(it, c.fill, th), bold: true})], {before: M.client.before * TW_PER_PT, after: 0, align: al})); break;
            case "meta": { const lc = it.labelColor ? col(it.labelColor) : color;
              RD.metaPairs(meta, it.fields).forEach(([l, v]) => { kids.push(para([run(l.toUpperCase(), {size: M.label.size * 2, bold: true, color: lc, cs: 30})], {after: M.label.after * TW_PER_PT, align: al})); kids.push(para([run(v, {size: M.value.size * 2, color})], {after: M.value.after * TW_PER_PT, align: al})); });
              break; }
            case "field": { const v = RD.fieldValue(meta, it.field); if(!v) break; const lc = it.labelColor ? col(it.labelColor) : (it.color ? color : MUTED);
              kids.push(para([run((it.label || RD.LABELS[it.field] || it.field).toUpperCase(), {size: M.label.size * 2, bold: true, color: lc, cs: 30})], {after: M.label.after * TW_PER_PT, align: al}));
              kids.push(para([run(v, {size: M.value.size * 2, color: it.color ? color : INK})], {after: M.value.after * TW_PER_PT, align: al})); break; }
            case "abbr": { const txt = meta.abbr || ""; if(!txt) break; const sz = RD.abbrSize(txt, availPt, it.size); kids.push(para([run(txt, {font: F.head, size: Math.round(sz * 2), bold: true, color})], {after: 0, line: 240, align: al})); break; }
            case "rule": { const wTwRule = Math.round((it.w || 9) / 100 * PAGE_W); const right = Math.max(0, (wTw - pad[1] - pad[3]) - wTwRule);
              kids.push(para([run("", {size: 2})], {before: M.rule.before * TW_PER_PT, after: M.rule.after * TW_PER_PT, line: 40, lineRule: D.LineRuleType.EXACT, border: {bottom: line(Math.round((it.size || M.rule.size) * 8), it.color ? color : A)}, indent: it.align === "center" ? {left: right / 2, right: right / 2} : {right}})); break; }
            case "space": kids.push(para([run("", {size: 2})], {before: Math.round((it.h || 4) / 100 * PAGE_H), after: 0, line: 40, lineRule: D.LineRuleType.EXACT})); break;
            case "photo": { const ps = assets.coverSlots && assets.coverSlots[`r${ri}c${ci}i${ii}`]; const hTwP = Math.round((it.h || 25) / 100 * PAGE_H);
              if(ps) kids.push(para([img(ps, (wTw - pad[1] - pad[3]) * PX_PER_TW, hTwP * PX_PER_TW)], {after: 0, line: 240}));
              else kids.push(para([run("", {size: 2})], {before: hTwP, after: 0, line: 40, lineRule: D.LineRuleType.EXACT}));
              break; }
          }
        });
        return cell(kids, {w: wTw, span: i1 - i0 > 1 ? i1 - i0 : undefined, fill: c.fill ? col(c.fill) : undefined, va, m: {top: pad[0], right: pad[1], bottom: pad[2], left: pad[3]}});
      });
      return row(cells, {h: hTw, exact: true});
    });
    return [table(rows, grid)];
  }

  /* ---------- Header / footer ---------- */
  const hw = Math.round(CW * 0.62);
  const header = new D.Header({children: [table([row([
    cell([para([run(meta.title || "", {size: 15, color: MUTED})], {after: 0})], {w: hw, m: {top: 0, bottom: 80, left: 0, right: 0}, borders: Object.assign({}, NB, {bottom: line(4, "BFBFBF")})}),
    cell([para([run(meta.client || "", {size: 15, color: MUTED})], {after: 0, align: D.AlignmentType.RIGHT})], {w: CW - hw, m: {top: 0, bottom: 80, left: 0, right: 0}, borders: Object.assign({}, NB, {bottom: line(4, "BFBFBF")})})
  ])], [hw, CW - hw])]});
  const footer = new D.Footer({children: [table([row([
    cell([para([run([meta.docType, meta.version].filter(Boolean).join("  ·  "), {size: 15, color: MUTED})], {after: 0})], {w: CW - 1200, m: {top: 80, bottom: 0, left: 0, right: 0}}),
    cell([new D.Paragraph({alignment: D.AlignmentType.RIGHT, spacing: {after: 0}, children: [new D.TextRun({children: [D.PageNumber.CURRENT], bold: true, color: P, size: 20, font: F.body})]})], {w: 1200, m: {top: 80, bottom: 0, left: 0, right: 0}})
  ])], [CW - 1200, 1200])]});

  /* ---------- Blocks ---------- */
  function caption(kind, chap, n, text){
    return para([run(`${kind} ${chap}.${n}`, {bold: true, color: A, size: 18}), run("   " + (text || ""), {bold: true, color: P, size: 18})], {after: 100, keepNext: true});
  }
  function blockOut(b, chap, counters){
    const out = [];
    switch(b.t){
      case "p": out.push(para(runs(b.text), {after: 160})); break;
      case "h": out.push(new D.Paragraph({heading: D.HeadingLevel.HEADING_2, keepNext: true, children: [new D.TextRun({text: b.text || "", font: F.head, bold: true, color: K, size: 28})]})); break;
      case "bullets": (b.items || []).forEach((it, i, arr) => out.push(para(runs(it), {after: i === arr.length - 1 ? 160 : 60, numbering: {reference: "bul", level: 0}}))); break;
      case "stats": {
        const solid = st.stat === "solid";
        util.chunk((b.items || []).slice(0, 8), 4).forEach(group => {
          const w = Math.floor(CW / group.length); const widths = group.map((_, i) => i === group.length - 1 ? CW - w * (group.length - 1) : w);
          out.push(table([row(group.map((s, i) => cell([
            para([run(s.value, {font: F.head, size: 46, bold: true, color: solid ? "FFFFFF" : P})], {after: 40, line: 240}),
            para([run(s.label, {size: 17, color: solid ? T : "4A4A4A"})], {after: 0, line: 260})
          ], {w: widths[i], fill: solid ? P : T, m: {top: 160, bottom: 180, left: 200, right: 160}, borders: {top: line(24, solid ? A : P), bottom: NONE, left: line(36, "FFFFFF"), right: line(36, "FFFFFF")}})), {cantSplit: true})], widths));
          out.push(spacer(120));
        });
        break;
      }
      case "callout": {
        const outline = st.callout === "outline";
        const kids = []; if(b.title) kids.push(para([run(b.title, {bold: true, color: outline ? A : P, size: 22})], {after: 60}));
        kids.push(para(runs(b.text), {after: 0}));
        out.push(table([row([cell(kids, {w: CW, fill: outline ? undefined : T, m: {top: 200, bottom: 200, left: 280, right: 280}, borders: outline ? {top: line(12, A), bottom: line(12, A), left: line(12, A), right: line(12, A)} : Object.assign({}, NB, {left: line(36, P)})})], {cantSplit: true})], [CW]));
        out.push(spacer(160)); break;
      }
      case "table": {
        const minimal = st.table === "minimal";
        const head = b.head || []; const ncol = Math.max(head.length, ...(b.rows || []).map(r => r.length), 1);
        const w = Math.floor(CW / ncol); const widths = Array.from({length: ncol}, (_, i) => i === ncol - 1 ? CW - w * (ncol - 1) : w);
        counters.table++; out.push(caption("Table", chap, counters.table, b.caption));
        const rows = [];
        if(head.length) rows.push(row(Array.from({length: ncol}, (_, i) => cell([para([run(head[i] ?? "", {bold: true, color: minimal ? P : "FFFFFF", size: minimal ? 16 : 17, caps: minimal})], {after: 0, line: 260})],
          {w: widths[i], fill: minimal ? undefined : P, m: {top: 90, bottom: 90, left: 110, right: 110}, borders: minimal ? Object.assign({}, NB, {bottom: line(16, P)}) : NB})), {header: true, cantSplit: true}));
        (b.rows || []).forEach((r, ri) => {
          const last = ri === b.rows.length - 1;
          rows.push(row(Array.from({length: ncol}, (_, i) => {
            const v = r[i] ?? ""; const rc = (b.rating === i) ? util.ratingColor(v) : null;
            return cell([para(runs(v, {size: 17, color: rc ? "FFFFFF" : INK, bold: !!rc}), {after: 0, line: 260})], {w: widths[i], fill: rc || (!minimal && ri % 2 ? T : undefined), m: {top: 80, bottom: 80, left: 110, right: 110},
              borders: {top: NONE, left: NONE, right: NONE, bottom: last ? line(minimal ? 8 : 12, P) : line(4, "D9D9D9")}});
          }), {cantSplit: true}));
        });
        out.push(table(rows, widths)); out.push(spacer(200)); break;
      }
      case "chart": {
        counters.fig++; out.push(caption("Figure", chap, counters.fig, (b.title || "") + (b.unit ? ` (${b.unit})` : "")));
        if(!DC){ out.push(para([run("[Chart]", {italics: true, color: MUTED})])); break; }
        const labels = (b.labels || []).map(String); const series = (b.series || []).filter(s => s && Array.isArray(s.values));
        if(!labels.length || !series.length){ out.push(para([run("[Chart data missing]", {italics: true, color: MUTED})])); break; }
        const kind = ["column", "bar", "line", "pie", "doughnut"].includes(b.kind) ? b.kind : "column";
        const font = {name: F.body}; const cols = util.seriesColors(th, Math.max(series.length, labels.length));
        let opts;
        if(kind === "pie" || kind === "doughnut"){
          opts = {type: kind, categories: labels, series: [{name: series[0].name || b.title || "Series", values: series[0].values.map(v => Number(v) || 0), colors: labels.map((_, i) => cols[i])}],
            dataLabels: {percentage: true, font: {size: 9, color: "FFFFFF", bold: true}}, legend: {position: "right", font: {size: 9}}};
        } else {
          opts = {type: kind, categories: labels, series: series.map((s, i) => ({name: s.name || `Series ${i + 1}`, values: s.values.map(v => v === null || v === "" ? null : Number(v)), color: cols[i]})),
            legend: series.length > 1 ? {position: "bottom", font: {size: 9}} : false,
            valueAxis: {gridlines: true, font: {size: 9, color: "595959"}}, categoryAxis: {font: {size: 9, color: "595959"}}};
          if(b.unit) opts.valueAxis.title = {text: b.unit};
          if(series.length === 1 && labels.length <= 10) opts.dataLabels = {value: true, font: {size: 8, color: "404040"}};
          if(kind !== "line") opts.gapWidth = 60;
        }
        Object.assign(opts, {font, chartArea: {fill: "FFFFFF", border: "none"}, transformation: {width: 620, height: 300}, altText: {name: b.title || "Chart", description: b.title || "Chart"}});
        try{ out.push(para([new DC.ChartRun(opts)], {after: 200, keepLines: true})); }
        catch(e){ out.push(para([run("[Chart could not be built: " + e.message + "]", {italics: true, color: MUTED})])); }
        break;
      }
      case "steps": {
        if(b.title){ counters.fig++; out.push(caption("Figure", chap, counters.fig, b.title)); }
        const items = b.items || []; let k = 0;
        util.chunk(items, items.length === 4 ? 4 : (items.length <= 3 ? Math.max(items.length, 1) : 3)).forEach(group => {
          const w = Math.floor(CW / group.length); const widths = group.map((_, i) => i === group.length - 1 ? CW - w * (group.length - 1) : w);
          out.push(table([row(group.map((s, i) => { k++; return cell([
            para([run(util.pad2(k), {font: F.head, size: 34, bold: true, color: A})], {after: 40, line: 240}),
            para([run(s.title, {bold: true, color: P, size: 19})], {after: 40, line: 260}),
            para(runs(s.text, {size: 17, color: "444444"}), {after: 0, line: 260})
          ], {w: widths[i], fill: T, m: {top: 140, bottom: 160, left: 160, right: 140}, borders: {top: line(24, A), bottom: NONE, left: line(36, "FFFFFF"), right: line(36, "FFFFFF")}}); }), {cantSplit: true})], widths));
          out.push(spacer(80));
        });
        out.push(spacer(120)); break;
      }
      case "quote": {
        out.push(para([run("“" + (b.text || "") + "”", {font: F.head, italics: true, size: 26, color: K})], {after: 60, line: 300, indent: {left: 400}, border: {left: line(18, A)}}));
        if(b.by) out.push(para([run(String(b.by).toUpperCase(), {size: 15, bold: true, color: MUTED, cs: 20})], {after: 220, indent: {left: 400}}));
        break;
      }
      case "image": {
        const a = b.src && assets.images && assets.images[b.src];
        if(a){
          let w = 640, h = w * a.h / a.w; if(h > 400){ h = 400; w = h * a.w / a.h; }
          out.push(para([img(a, w, h)], {after: 60, keepNext: true}));
        } else {
          const dash = line(8, "BFBFBF", D.BorderStyle.DASHED);
          out.push(table([row([cell([para([run("Photo placeholder" + (b.caption ? ": " + b.caption : ""), {italics: true, color: MUTED, size: 18})], {after: 0, align: D.AlignmentType.CENTER})], {w: CW, fill: "F7F8F7", va: D.VerticalAlign.CENTER, borders: {top: dash, bottom: dash, left: dash, right: dash}})], {h: 2400})], [CW]));
        }
        if(a && b.caption){ counters.photo++; out.push(para([run(`Photo ${chap}.${counters.photo}  `, {bold: true, color: A, size: 17}), run(b.caption, {italics: true, size: 17, color: MUTED})], {after: 200})); }
        else out.push(spacer(160));
        break;
      }
      default: if(b.text) out.push(para(runs(b.text)));
    }
    return out;
  }

  /* ---------- Chapter openers ---------- */
  let noBreak = false; // set for the first chapter when there is no front matter, so the body doesn't start with a blank page
  function chapterOpen(sec, chap){
    const brk = !noBreak; noBreak = false;
    const title = sec.title || `Section ${chap}`;
    const out = [];
    if(st.chapter === "band"){
      out.push(para([run("", {size: 2})], {pbb: brk, after: 0, line: 40, lineRule: D.LineRuleType.EXACT}));
      out.push(table([row([cell([
        para([run(util.pad2(chap), {font: F.head, size: 40, bold: true, color: A})], {after: 40, line: 240}),
        new D.Paragraph({heading: D.HeadingLevel.HEADING_1, children: [new D.TextRun({text: title, font: F.head, size: 44, color: "FFFFFF", bold: F.headBold})], spacing: {before: 0, after: 0, line: 260, lineRule: AUTO}})
      ], {w: CW, fill: P, m: {top: 320, bottom: 340, left: 360, right: 360}})], {cantSplit: true})], [CW]));
      out.push(spacer(320));
    } else if(st.chapter === "line"){
      out.push(new D.Paragraph({heading: D.HeadingLevel.HEADING_1, pageBreakBefore: brk, keepNext: true, border: {left: line(48, A, D.BorderStyle.SINGLE)}, indent: {left: 240},
        children: [new D.TextRun({text: util.pad2(chap) + "   ", font: F.head, size: 44, bold: true, color: A}), new D.TextRun({text: title, font: F.head, size: 44, color: P, bold: F.headBold})], spacing: {before: 0, after: 360, line: 260, lineRule: AUTO}}));
    } else {
      out.push(para([run(util.pad2(chap), {font: F.head, size: 56, bold: true, color: A})], {pbb: brk, after: 60, line: 240, keepNext: true}));
      out.push(new D.Paragraph({heading: D.HeadingLevel.HEADING_1, keepNext: true, children: [new D.TextRun({text: title, font: F.head, size: 50, color: P, bold: F.headBold})], spacing: {after: 120, line: 260, lineRule: AUTO}}));
      out.push(new D.Paragraph({children: [new D.TextRun({text: "", size: 4})], spacing: {after: 320}, border: {bottom: line(24, P)}, indent: {right: CW - 1100}}));
    }
    return out;
  }

  /* ---------- Front matter + chapters ---------- */
  const body = []; const O = Object.assign({docInfo: true, contents: true}, opts || {});
  if(O.docInfo){
  body.push(para([run("Document information", {font: F.head, size: 40, color: P, bold: F.headBold})], {after: 240}));
  const info = [["Document", meta.title], ["Document type", meta.docType], ["Prepared for", meta.client], ["Prepared by", meta.preparedBy], ["Date", meta.date], ["Version / status", meta.version]].filter(r => r[1]);
  if(info.length) body.push(table(info.map(r => row([
    cell([para([run(r[0], {bold: true, color: P, size: 19})], {after: 0})], {w: 3200, fill: T, borders: Object.assign({}, NB, {bottom: line(4, "D9D9D9")})}),
    cell([para([run(r[1], {size: 19})], {after: 0})], {w: CW - 3200, borders: Object.assign({}, NB, {bottom: line(4, "D9D9D9")})})
  ])), [3200, CW - 3200]));
  body.push(spacer(400));
  }
  if(O.contents){
  body.push(para([run("Contents", {font: F.head, size: 40, color: P, bold: F.headBold})], {after: 200, before: 400}));
  body.push(new D.TableOfContents("Contents", {hyperlink: true, headingStyleRange: "1-1"}));
  body.push(para([run("If the contents list is empty, right-click it in Word and choose Update Field.", {size: 15, italics: true, color: MUTED})], {before: 120}));
  }
  if(!body.length) noBreak = true;

  (m.sections || []).forEach((sec, i) => {
    const chap = i + 1; const counters = {table: 0, fig: 0, photo: 0};
    body.push(...chapterOpen(sec, chap));
    const blocks = sec.blocks || [];
    if(!blocks.length) body.push(para([run("[To be completed]", {italics: true, color: MUTED})]));
    blocks.forEach(b => body.push(...blockOut(b, chap, counters)));
  });

  const page = {size: {width: PAGE_W, height: PAGE_H}};
  return new D.Document({
    creator: meta.preparedBy || "Report Studio", title: meta.title || "Report", description: meta.subtitle || "",
    features: {updateFields: true},
    styles: {
      default: {document: {run: {font: F.body, size: 21, color: INK}, paragraph: {spacing: {after: 120, line: 288, lineRule: AUTO}}}},
      paragraphStyles: [
        {id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: {font: F.head, size: 50, color: P, bold: F.headBold}, paragraph: {spacing: {before: 0, after: 120}, keepNext: true}},
        {id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: {font: F.head, size: 28, color: K, bold: true}, paragraph: {spacing: {before: 280, after: 100}, keepNext: true}}
      ]
    },
    numbering: {config: [{reference: "bul", levels: [{level: 0, format: D.LevelFormat.BULLET, text: "▪", alignment: D.AlignmentType.LEFT, style: {paragraph: {indent: {left: 400, hanging: 280}}, run: {color: A, font: "Arial"}}}]}]},
    sections: [
      {properties: {page: Object.assign({}, page, {margin: {top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0}})}, children: [...coverChildren(), tiny()]},
      {properties: {page: Object.assign({}, page, {margin: {top: 1300, right: MAR, bottom: 1200, left: MAR, header: 560, footer: 560}, pageNumbers: {start: 1}})}, headers: {default: header}, footers: {default: footer}, children: body}
    ]
  });
};

export const buildDocx = X.build;
export const coverSlots = X.coverSlots;
export const PAGE = X.PAGE;
