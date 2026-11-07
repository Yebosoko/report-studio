/* Read a draft from Word (.docx via mammoth), PDF (via pdf.js) or text. Libraries load on demand. */
function htmlToText(html){
  const d = document.createElement("div"); d.innerHTML = html; const out = [];
  const walk = n => {
    for(const c of n.children){
      const tag = c.tagName;
      if(/^H[1-6]$/.test(tag)) out.push("\n" + "#".repeat(+tag[1]) + " " + c.textContent.trim());
      else if(tag === "P"){ const t = c.textContent.trim(); if(t) out.push(t); }
      else if(tag === "UL" || tag === "OL") c.querySelectorAll(":scope>li").forEach(li => out.push("- " + li.textContent.trim()));
      else if(tag === "TABLE"){ c.querySelectorAll("tr").forEach(tr => out.push("| " + Array.from(tr.children).map(td => td.textContent.trim().replace(/\s+/g, " ")).join(" | ") + " |")); out.push(""); }
      else walk(c);
    }
  };
  walk(d); return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
export async function loadPdfJs(){
  const lib = await import("pdfjs-dist/build/pdf.min.js");
  const pdfjs = lib.default || lib;
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  return pdfjs;
}
export async function openPdf(file){ const pdfjs = await loadPdfJs(); return pdfjs.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise; }
export async function renderPdfPage(doc, n, width){
  const page = await doc.getPage(n); const vp1 = page.getViewport({scale: 1}); const vp = page.getViewport({scale: width / vp1.width});
  const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({canvasContext: ctx, viewport: vp}).promise; return c;
}
export async function pdfText(doc, maxPages, maxChars){
  let out = "";
  for(let i = 1; i <= Math.min(doc.numPages, maxPages || 40) && out.length < (maxChars || 200000); i++){
    const page = await doc.getPage(i); const tc = await page.getTextContent();
    let lastY = null, line = "";
    tc.items.forEach(it => { const y = Math.round(it.transform[5]); if(lastY !== null && Math.abs(y - lastY) > 2){ out += line.trim() + "\n"; line = ""; } line += it.str + (it.hasEOL ? "\n" : " "); lastY = y; });
    out += line.trim() + "\n\n";
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
export async function importText(file){
  if(/\.docx$/i.test(file.name)){ const mammoth = await import("mammoth/mammoth.browser.js"); const m = mammoth.default || mammoth; const res = await m.convertToHtml({arrayBuffer: await file.arrayBuffer()}); return htmlToText(res.value); }
  if(/\.pdf$/i.test(file.name)){ const doc = await openPdf(file); return pdfText(doc, 200, 400000); }
  return file.text();
}
