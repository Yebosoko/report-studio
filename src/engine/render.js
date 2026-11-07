/* engine/render.js — HTML for covers (from the library's cover layouts), template and report thumbnails, and report
   colour variables. The Word versions of the same covers are built in docx.js from the same layouts and metrics (RD.M). */
import { util, color } from "./library.js";
const esc = util.esc;
const RD = {};
const PW = 595.3; /* A4 width in points */
RD.PW = PW;
RD.cq = pt => (pt * 100 / PW).toFixed(3) + "cqw";            /* points → container units (1cqw = 1% of page width) */
RD.cqh = pctH => (pctH * 1.4142).toFixed(3) + "cqw";          /* % of page height → container units */
/* Type sizes (pt) and spacing (pt) for cover items. Word export uses the same numbers. */
RD.M = {
  eyebrow: {size: 9, after: 8}, title: {size: 30, after: 10}, subtitle: {size: 13, after: 10},
  client: {size: 10, before: 10}, label: {size: 7, after: 1.5}, value: {size: 10, after: 7},
  logo: {size: 40, after: 10}, rule: {size: 2.5, before: 10, after: 14}, abbr: {size: 100}
};
RD.LABELS = {client: "Prepared for", preparedBy: "Prepared by", date: "Date", version: "Version", docType: "Document type", title: "Title", subtitle: "Subtitle"};
/* Largest abbreviation size (pt) that fits the available width. */
RD.abbrSize = (text, availPt, base) => Math.max(18, Math.min(base || RD.M.abbr.size, availPt / (0.68 * Math.max(1, String(text || "").length))));
/* Label/value pairs for a meta item. Date and version share one line. */
RD.metaPairs = (m, fields) => {
  const out = [];
  (fields || ["client", "preparedBy", "date"]).forEach(f => {
    let v = m[f];
    if(f === "date") v = [m.date, m.version].filter(Boolean).join("  ·  ");
    if(v) out.push([RD.LABELS[f] || f, v]);
  });
  return out;
};
RD.fieldValue = (m, f) => f === "date" ? (m.date || "") : (m[f] || "");
RD.varStyle = (th, f) => `--r-primary:#${th.primary};--r-secondary:#${th.secondary};--r-accent:#${th.accent};--r-tint:#${th.tint};--r-dark:#${th.dark};--r-head:${f.cssHead};--r-body:${f.cssBody};--r-headw:${f.w || 600}`;
RD.setVars = (el, th, f) => { RD.varStyle(th, f).split(";").forEach(p => { const i = p.indexOf(":"); el.style.setProperty(p.slice(0, i), p.slice(i + 1)); }); };

/* Cover HTML. o = {def, theme, font, meta, abbr, logo (url), photo (url), editable} */
RD.cover = o => {
  const th = o.theme, f = o.font, m = o.meta || {}, def = o.def;
  const col = ref => "#" + color(ref, th);
  const ed = (key, ph, cls, style) => o.editable
    ? `<div class="${cls}" style="${style}" contenteditable="true" data-meta="${key}" data-ph="${esc(ph)}">${esc(m[key] || "")}</div>`
    : `<div class="${cls}" style="${style}">${esc(m[key] || "")}</div>`;
  const rowsHTML = (def.rows || []).map(row => {
    const cells = (row.cells || []).map(c => {
      const pad = c.pad || [0, 0, 0, 0];
      const showPhoto = c.image && o.photo;
      const just = c.v === "bottom" ? "flex-end" : c.v === "center" ? "center" : "flex-start";
      const availPt = (c.w / 100) * PW - ((pad[1] + pad[3]) / 100) * PW;
      const inner = showPhoto ? `<img class="cv-img" src="${esc(o.photo)}" alt="">` : (c.items || []).map(it => item(it, availPt, c.fill)).join("");
      return `<div class="cv-cell" style="width:${c.w}%;${c.fill ? `background:${col(c.fill)};` : ""}padding:${showPhoto ? "0" : pad.map(p => p + "cqw").join(" ")};justify-content:${just}">${inner}</div>`;
    }).join("");
    return `<div class="cv-row" style="height:${row.h}%">${cells}</div>`;
  }).join("");
  return `<div class="cover" style="font-family:${f.cssBody}">${rowsHTML}</div>`;

  function item(it, availPt, fill){
    const color = it.color ? col(it.color) : "inherit";
    const al = it.align ? `text-align:${it.align};` : "";
    const M = RD.M;
    switch(it.k){
      case "logo": return o.logo ? `<div style="${al}margin-bottom:${RD.cq(M.logo.after)}"><img class="cv-logo" src="${esc(o.logo)}" alt="Logo" style="height:${RD.cq(it.size || M.logo.size)};${it.align === "center" ? "margin:0 auto" : it.align === "right" ? "margin-left:auto" : ""}"></div>` : "";
      case "eyebrow": return m.docType ? `<div class="cv-eyebrow" style="${al}color:${color};font-size:${RD.cq(it.size || M.eyebrow.size)};margin-bottom:${RD.cq(M.eyebrow.after)}">${esc(m.docType)}</div>` : "";
      case "title": return ed("title", "Report title", "cv-title", `${al}color:${color};font-size:${RD.cq(it.size || M.title.size)};margin-bottom:${RD.cq(M.title.after)}`);
      case "subtitle": return (m.subtitle || o.editable) ? ed("subtitle", "Subtitle", "cv-sub", `${al}color:${color};font-size:${RD.cq(it.size || M.subtitle.size)};margin-bottom:${RD.cq(M.subtitle.after)}`) : "";
      case "client": return m.client ? `<div class="cv-sub" style="${al}color:${color};font-size:${RD.cq(it.size || M.client.size)};margin-top:${RD.cq(M.client.before)}">Prepared for <strong style="color:#${RD.strongColor(it, fill, th)}">${esc(m.client)}</strong></div>` : "";
      case "meta": {
        const lc = it.labelColor ? col(it.labelColor) : color;
        return RD.metaPairs(m, it.fields).map(([l, v]) => `<div style="${al}"><div class="cv-label" style="color:${lc};font-size:${RD.cq(M.label.size)};margin-bottom:${RD.cq(M.label.after)}">${esc(l)}</div><div style="color:${color};font-size:${RD.cq(M.value.size)};margin-bottom:${RD.cq(M.value.after)}">${esc(v)}</div></div>`).join("");
      }
      case "field": {
        const v = RD.fieldValue(m, it.field); if(!v) return "";
        const lc = it.labelColor ? col(it.labelColor) : (it.color ? color : "#6B6B6B");
        return `<div style="${al}"><div class="cv-label" style="color:${lc};font-size:${RD.cq(M.label.size)};margin-bottom:${RD.cq(M.label.after)}">${esc(it.label || RD.LABELS[it.field] || it.field)}</div><div style="color:${it.color ? color : "#2B2B2B"};font-size:${RD.cq(M.value.size)};margin-bottom:${RD.cq(M.value.after)}">${esc(v)}</div></div>`;
      }
      case "abbr": { const txt = o.abbr || m.abbr || ""; const sz = RD.abbrSize(txt, availPt, it.size); return txt ? `<div class="cv-abbr" style="${al}color:${color};font-size:${RD.cq(sz)}">${esc(txt)}</div>` : ""; }
      case "rule": return `<div style="height:${RD.cq(it.size || M.rule.size)};width:${(it.w || 9)}cqw;background:${color === "inherit" ? col("accent") : color};margin:${RD.cq(M.rule.before)} ${it.align === "center" ? "auto" : "0"} ${RD.cq(M.rule.after)}"></div>`;
      case "space": return `<div style="height:${RD.cqh(it.h || 4)};flex:none"></div>`;
      case "photo": return o.photo ? `<div style="height:${RD.cqh(it.h || 25)};flex:none;overflow:hidden"><img class="cv-img" src="${esc(o.photo)}" alt=""></div>` : `<div style="height:${RD.cqh(it.h || 25)};flex:none"></div>`;
    }
    return "";
  }
};
/* Colour for the client name in a "client" item: white on dark fills, ink on light ones, unless strongColor is set. */
RD.strongColor = (it, fill, th) => it.strongColor ? color(it.strongColor, th) : (fill && !["white", "tint"].includes(fill) ? "FFFFFF" : "2B2B2B");
/* A template's cover as a thumbnail, with its own name as the title. */
RD.thumb = (L, tpl, over) => {
  const ov = over || {};
  const th = L.theme(ov.theme || tpl.theme), f = L.font(ov.font || tpl.font), def = L.cover(ov.cover || tpl.cover);
  const meta = {title: ov.title || tpl.name, subtitle: ov.subtitle || "", docType: tpl.docType, client: "Client name", preparedBy: "Your firm", date: "2026", version: "v1", abbr: tpl.abbr};
  return `<div class="thumb" style="${RD.varStyle(th, f)}">${RD.cover({def, theme: th, font: f, meta, abbr: tpl.abbr})}</div>`;
};
/* A report's own cover as a thumbnail. */
RD.reportThumb = (L, sum) => {
  const tpl = L.tpl(sum.templateId);
  return RD.thumb(L, tpl, {theme: sum.theme, font: sum.font, cover: sum.cover, title: sum.title});
};
RD.themeBar = th => `<span class="bar"><i style="background:#${th.primary}"></i><i style="background:#${th.secondary}"></i><i style="background:#${th.accent}"></i></span>`;

export default RD;
export const render = RD;
