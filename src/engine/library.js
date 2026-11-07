/* engine/library.js — shared by the browser (editor, previews, export) and the server (Studio Lab checks).
   Library helpers, constants, validation and small utilities. Pure functions: no DOM, no globals. */
const U = {};
U.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
U.md = s => U.esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
U.clone = o => JSON.parse(JSON.stringify(o));
U.uid = () => Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 7);
U.pad2 = n => String(n).padStart(2, "0");
U.chunk = (arr, n) => { const o = []; for(let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
U.now = () => new Date().toISOString();
U.mixHex = (hex, withHex, t) => {
  const a = [0, 2, 4].map(i => parseInt(hex.substr(i, 2), 16)), b = [0, 2, 4].map(i => parseInt(withHex.substr(i, 2), 16));
  return a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
};
/* Status/rating words to a fill colour (hex, no #). Colour is never the only signal: the word stays in the cell. */
U.ratingColor = v => {
  const s = String(v || "").toLowerCase();
  if(!s) return null;
  if(/non[- ]?compl|not compl|not achieved|overdue|critical|\bhigh\b|major|severe|\bopen\b|\bred\b|significant/.test(s)) return "B83227";
  if(/partial|moderate|medium|in progress|ongoing|pending|\bamber\b/.test(s)) return "D98A06";
  if(/\bcompl|achieved|closed|complete|\blow\b|minor|resolved|\bgreen\b|\bdone\b/.test(s)) return "2E8B57";
  if(/positive|beneficial/.test(s)) return "2471A3";
  if(/negligible|n\/a|not applicable/.test(s)) return "7F8C8D";
  return null;
};
U.seriesColors = (th, n) => {
  const base = [th.primary, th.secondary, th.accent, th.dark, U.mixHex(th.secondary, "FFFFFF", .45), U.mixHex(th.accent, "FFFFFF", .45), U.mixHex(th.primary, "FFFFFF", .55), "8C9A94"];
  const out = []; for(let i = 0; i < n; i++) out.push(base[i % base.length]); return out;
};
U.lineDiff = (aText, bText) => {
  const a = String(aText ?? "").split("\n"), b = String(bText ?? "").split("\n");
  let pre = 0; while(pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0; while(suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf), B = b.slice(pre, b.length - suf);
  const N = A.length, M = B.length, MAX = N + M;
  let ops = [];
  if(MAX === 0){ ops = []; }
  else if(MAX > 8000){ ops = A.map(s => ["-", s]).concat(B.map(s => ["+", s])); }
  else{
    const off = MAX + 1; const v = new Int32Array(2 * MAX + 3); const trace = [];
    outer: for(let d = 0; d <= MAX; d++){
      trace.push(v.slice());
      for(let k = -d; k <= d; k += 2){
        let x = (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) ? v[off + k + 1] : v[off + k - 1] + 1;
        let y = x - k;
        while(x < N && y < M && A[x] === B[y]){ x++; y++; }
        v[off + k] = x;
        if(x >= N && y >= M) break outer;
      }
    }
    let x = N, y = M;
    for(let d = trace.length - 1; d >= 0; d--){
      const vd = trace[d]; const k = x - y;
      const prevK = (k === -d || (k !== d && vd[off + k - 1] < vd[off + k + 1])) ? k + 1 : k - 1;
      const prevX = vd[off + prevK], prevY = prevX - prevK;
      while(x > prevX && y > prevY){ ops.push([" ", A[x - 1]]); x--; y--; }
      if(d > 0){ if(x === prevX) ops.push(["+", B[y - 1]]); else ops.push(["-", A[x - 1]]); }
      x = prevX; y = prevY;
    }
    ops.reverse();
  }
  const ctxBefore = a.slice(Math.max(0, pre - 3), pre).map(s => [" ", s]);
  const ctxAfter = a.slice(a.length - suf, a.length - suf + 3).map(s => [" ", s]);
  const all = ctxBefore.concat(ops, ctxAfter);
  let adds = 0, dels = 0; ops.forEach(o => { if(o[0] === "+") adds++; else if(o[0] === "-") dels++; });
  return {lines: all.map(o => ({t: o[0], s: o[1]})), adds, dels, startLine: Math.max(1, pre - 2)};
};


const S = {};
S.STYLE_OPTIONS = {
  chapter: [["number", "Number"], ["band", "Band"], ["line", "Side line"]],
  table: [["solid", "Solid header"], ["minimal", "Minimal"]],
  stat: [["tint", "Tinted"], ["solid", "Solid"]],
  callout: [["tint", "Tinted"], ["outline", "Outline"]]
};
S.STYLE_LABELS = {chapter: "Chapter openers", table: "Tables", stat: "Key figures", callout: "Key messages"};
S.DEFAULT_STYLE = {chapter: "number", table: "solid", stat: "tint", callout: "tint"};
S.COLOR_NAMES = ["primary", "secondary", "accent", "tint", "dark", "white", "ink", "muted", "black"];
S.COVER_ITEM_KINDS = ["logo", "eyebrow", "title", "subtitle", "client", "meta", "field", "abbr", "rule", "space", "photo"];
S.META_FIELDS = ["title", "subtitle", "docType", "client", "preparedBy", "date", "version"];
S.BLOCK_TYPES = ["p", "h", "bullets", "stats", "callout", "table", "chart", "steps", "quote", "image"];

/* Resolve a colour reference ("primary", "white", "#1A2B3C"...) against a theme. Returns hex without #. */
S.color = (ref, th) => {
  if(!ref) return null;
  const r = String(ref);
  if(/^#?[0-9a-f]{6}$/i.test(r)) return r.replace("#", "").toUpperCase();
  if(r === "white") return "FFFFFF";
  if(r === "black") return "000000";
  if(r === "ink") return "2B2B2B";
  if(r === "muted") return "6B6B6B";
  return (th && th[r]) || (th && th.primary) || "333333";
};

S.color = (ref, th) => {
  if(!ref) return null;
  const r = String(ref);
  if(/^#?[0-9a-f]{6}$/i.test(r)) return r.replace("#", "").toUpperCase();
  if(r === "white") return "FFFFFF";
  if(r === "black") return "000000";
  if(r === "ink") return "2B2B2B";
  if(r === "muted") return "6B6B6B";
  return (th && th[r]) || (th && th.primary) || "333333";
};
const byId = (list, id) => (list || []).find(x => x.id === id);
function validateLibrary(lib){
  const errors = [], warnings = [];
  const isColor = c => c == null || S.COLOR_NAMES.includes(c) || /^#?[0-9a-f]{6}$/i.test(String(c));
  const idOk = id => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(id);
  if(!lib || typeof lib !== "object") return {errors: ["The library is not an object."], warnings};
  ["categories", "houseRules", "themes", "fonts", "covers", "templates"].forEach(k => { if(!Array.isArray(lib[k])) errors.push(`"${k}" must be a list.`); });
  if(errors.length) return {errors, warnings};
  const dup = (list, kind) => { const seen = new Set(); list.forEach(x => { if(!idOk(x.id)) errors.push(`${kind} id "${x.id}" must be lowercase letters, digits and hyphens.`); if(seen.has(x.id)) errors.push(`Two ${kind}s share the id "${x.id}".`); seen.add(x.id); }); };
  dup(lib.themes, "theme"); dup(lib.fonts, "font"); dup(lib.covers, "cover"); dup(lib.templates, "template");
  if(!lib.themes.length) errors.push("At least one theme is needed.");
  if(!lib.fonts.length) errors.push("At least one font pairing is needed.");
  if(!lib.covers.length) errors.push("At least one cover is needed.");
  if(!lib.templates.length) errors.push("At least one template is needed.");
  lib.themes.forEach(t => ["primary", "secondary", "accent", "tint", "dark"].forEach(k => { if(!/^[0-9A-Fa-f]{6}$/.test(String(t[k] || ""))) errors.push(`Theme "${t.id}": ${k} must be a 6-digit hex colour without #.`); }));
  lib.fonts.forEach(f => ["head", "body", "cssHead", "cssBody"].forEach(k => { if(!f[k] || typeof f[k] !== "string") errors.push(`Font "${f.id}": ${k} is missing.`); }));
  lib.covers.forEach(c => {
    const where = `Cover "${c.id}"`;
    if(!Array.isArray(c.rows) || !c.rows.length){ errors.push(`${where} needs rows.`); return; }
    const sumH = c.rows.reduce((a, r) => a + (Number(r.h) || 0), 0);
    if(sumH > 100.5) errors.push(`${where}: row heights add up to ${sumH.toFixed(1)}%, more than 100%.`);
    c.rows.forEach((r, ri) => {
      if(!(Number(r.h) > 0)) errors.push(`${where} row ${ri + 1}: h must be a positive percentage of page height.`);
      if(!Array.isArray(r.cells) || !r.cells.length){ errors.push(`${where} row ${ri + 1} needs cells.`); return; }
      const sumW = r.cells.reduce((a, x) => a + (Number(x.w) || 0), 0);
      if(Math.abs(sumW - 100) > 0.6) errors.push(`${where} row ${ri + 1}: cell widths add up to ${sumW.toFixed(2)}%, they must add up to 100%.`);
      r.cells.forEach((cell, ci) => {
        const cw = `${where} row ${ri + 1} cell ${ci + 1}`;
        if(!(Number(cell.w) > 0)) errors.push(`${cw}: w must be positive.`);
        if(!isColor(cell.fill)) errors.push(`${cw}: unknown fill colour "${cell.fill}".`);
        if(cell.pad != null && (!Array.isArray(cell.pad) || cell.pad.length !== 4 || cell.pad.some(p => !(Number(p) >= 0 && Number(p) <= 45)))) errors.push(`${cw}: pad must be four numbers (top, right, bottom, left) in % of page width.`);
        if(cell.v != null && !["top", "center", "bottom"].includes(cell.v)) errors.push(`${cw}: v must be top, center or bottom.`);
        (cell.items || []).forEach((it, ii) => {
          if(!S.COVER_ITEM_KINDS.includes(it.k)) errors.push(`${cw} item ${ii + 1}: unknown kind "${it.k}".`);
          if(!isColor(it.color) || !isColor(it.labelColor)) errors.push(`${cw} item ${ii + 1}: unknown colour.`);
          if(it.k === "field" && !S.META_FIELDS.includes(it.field)) errors.push(`${cw} item ${ii + 1}: field must be one of ${S.META_FIELDS.join(", ")}.`);
          if(it.fields && (!Array.isArray(it.fields) || it.fields.some(f => !S.META_FIELDS.includes(f)))) errors.push(`${cw} item ${ii + 1}: fields must come from ${S.META_FIELDS.join(", ")}.`);
        });
      });
    });
  });
  const cats = new Set(lib.categories);
  lib.templates.forEach(t => {
    const w = `Template "${t.id}"`;
    if(!t.name) errors.push(`${w} needs a name.`);
    if(!t.abbr) warnings.push(`${w} has no abbreviation (abbr).`);
    if(!byId(lib.themes, t.theme)) errors.push(`${w}: theme "${t.theme}" doesn't exist.`);
    if(!byId(lib.covers, t.cover)) errors.push(`${w}: cover "${t.cover}" doesn't exist.`);
    if(!byId(lib.fonts, t.font)) errors.push(`${w}: font "${t.font}" doesn't exist.`);
    if(!cats.has(t.cat)) warnings.push(`${w}: category "${t.cat}" isn't in the category list.`);
    if(!Array.isArray(t.sections) || !t.sections.length) errors.push(`${w} needs at least one section.`);
    else t.sections.forEach((s, i) => { if(!s || !s.title) errors.push(`${w} section ${i + 1} needs a title.`); });
    const st = t.style || {};
    Object.keys(st).forEach(k => { const opts = S.STYLE_OPTIONS[k]; if(!opts) warnings.push(`${w}: unknown style "${k}".`); else if(!opts.some(o => o[0] === st[k])) errors.push(`${w}: style ${k} must be one of ${opts.map(o => o[0]).join(", ")}.`); });
  });
  if(lib.brand && lib.brand.defaultTheme && !byId(lib.themes, lib.brand.defaultTheme)) warnings.push(`Brand default theme "${lib.brand.defaultTheme}" doesn't exist.`);
  return {errors, warnings};
};


/* Library accessor with fallbacks: L.tpl(id), L.theme(id), L.cover(id), L.font(id), L.styleOf(obj). */
function makeLib(lib){
  return {
    lib,
    tpl: id => byId(lib.templates, id) || lib.templates[0],
    theme: id => byId(lib.themes, id) || lib.themes[0],
    cover: id => byId(lib.covers, id) || lib.covers[0],
    font: id => byId(lib.fonts, id) || lib.fonts[0],
    styleOf: obj => Object.assign({}, S.DEFAULT_STYLE, (obj && obj.style) || {})
  };
}
export const util = U;
export const STYLE_OPTIONS = S.STYLE_OPTIONS, STYLE_LABELS = S.STYLE_LABELS, DEFAULT_STYLE = S.DEFAULT_STYLE,
  COLOR_NAMES = S.COLOR_NAMES, COVER_ITEM_KINDS = S.COVER_ITEM_KINDS, META_FIELDS = S.META_FIELDS, BLOCK_TYPES = S.BLOCK_TYPES;
export const color = S.color;
export { validateLibrary, makeLib, byId };
