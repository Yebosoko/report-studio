/* POST multipart — upload a sample (owner only): name, organisation, notes, kind, pageCount, text, and up to 8 page images (page_<n>). */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, IMAGE_TYPES, ok } from "@/lib/api";
import { util } from "@/engine/library.js";

export const maxDuration = 60;
export async function POST(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const f = await req.formData().catch(() => null); if (!f) return bad("Send the sample as a form upload.");
  const str = (k: string, n = 300) => String(f.get(k) || "").trim().slice(0, n);
  const name = str("name"); if (!name) return bad("Give the sample a name.");
  const folder = `samples/${Date.now().toString(36)}-${util.uid()}`;
  const pages: Array<{ path: string; w: number; h: number; page: number }> = [];
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("page_") || !(v instanceof Blob) || pages.length >= 8) continue;
    const ext = IMAGE_TYPES[v.type]; if (!ext || v.size > 6 * 1024 * 1024) continue;
    const page = parseInt(k.slice(5)) || pages.length + 1;
    const path = `${folder}/p${page}.${ext}`;
    await s.repo.putFile(path, new Uint8Array(await v.arrayBuffer()), v.type);
    const dims = String(f.get(`dims_${page}`) || "1200x1700").split("x").map(n => parseInt(n) || 1000);
    pages.push({ path, w: dims[0], h: dims[1], page });
  }
  const sample = await s.repo.saveSample({ name, organisation: str("organisation", 120), notes: str("notes", 2000), kind: str("kind", 20) || "PDF", pageCount: parseInt(str("pageCount")) || pages.length || null, pages, textExcerpt: str("text", 20000) });
  await s.repo.audit(s.profile.id, "sample.upload", sample.id, { name, pages: pages.length });
  return ok({ sample });
}
