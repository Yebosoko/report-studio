/* Small DOM helpers for the editor: toasts, modals, confirmations. Styled by editor.css with the app's tokens. */
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function toast(msg, ms){
  let box = document.getElementById("rs-toasts");
  if(!box){ box = document.createElement("div"); box.id = "rs-toasts"; box.className = "rs-toasts"; box.setAttribute("role", "status"); document.body.appendChild(box); }
  const t = document.createElement("div"); t.className = "rs-toast"; t.textContent = msg; box.appendChild(t);
  while(box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => t.remove(), ms || 3400);
}
export function modal(html, opts){
  const scrim = document.createElement("div"); scrim.className = "rs-scrim";
  scrim.innerHTML = `<div class="rs-modal ${opts && opts.wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(scrim);
  const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); if(opts && opts.onClose) opts.onClose(); };
  const onKey = e => { if(e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  scrim.addEventListener("click", e => { if(e.target === scrim) close(); });
  return {el: scrim.firstElementChild, close};
}
export const confirmBox = (title, body, ok, cancel, danger) => new Promise(res => {
  const m = modal(`<h3>${esc(title)}</h3><p>${esc(body)}</p><div class="rs-actions"><button class="btn" data-no>${esc(cancel || "Cancel")}</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-yes>${esc(ok || "Continue")}</button></div>`, {onClose: () => res(false)});
  m.el.querySelector("[data-yes]").onclick = () => { res(true); m.close(); };
  m.el.querySelector("[data-no]").onclick = () => m.close();
  m.el.querySelector("[data-yes]").focus();
});
export const debounce = (fn, ms) => { let t = null, args = null; const d = (...a) => { args = a; clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, ms); }; d.flush = () => { if(t){ clearTimeout(t); t = null; return fn(...args); } }; d.cancel = () => { clearTimeout(t); t = null; }; return d; };
export const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Image could not be loaded")); i.src = src; });
/* Re-encode an image file as JPEG (or PNG for logos) no wider than maxW. */
export async function toImageBlob(file, maxW, keepPng){
  const src = URL.createObjectURL(file);
  try{
    const img = await loadImage(src);
    const s = Math.min(1, (maxW || 1600) / img.naturalWidth);
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
    const ctx = c.getContext("2d"); const png = keepPng && /png/i.test(file.type);
    if(!png){ ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const type = png ? "image/png" : "image/jpeg";
    return {blob: await new Promise(r => c.toBlob(r, type, 0.86)), w: c.width, h: c.height, type};
  } finally { URL.revokeObjectURL(src); }
}
export function downloadBlob(name, blob){
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
