/* POST multipart {file, kind: "report"|"logo", w, h} — stores an image in the user's own folder and returns an ImageRef. */
import { apiUser, isResponse } from "@/lib/auth";
import { bad, IMAGE_TYPES, ok } from "@/lib/api";
import { util } from "@/engine/library.js";

const MAX = 8 * 1024 * 1024;
export async function POST(req: Request) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const form = await req.formData().catch(() => null); if (!form) return bad("Send the image as a form upload.");
  const file = form.get("file"); if (!(file instanceof Blob)) return bad("No image was attached.");
  const ext = IMAGE_TYPES[file.type]; if (!ext) return bad("Use a PNG, JPEG or WebP image.");
  if (file.size > MAX) return bad("That image is over 8 MB. Use a smaller one.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = bytes.slice(0, 12); const isPng = sig[0] === 0x89 && sig[1] === 0x50; const isJpg = sig[0] === 0xff && sig[1] === 0xd8; const isWebp = sig[8] === 0x57 && sig[9] === 0x45;
  if (!(isPng || isJpg || isWebp)) return bad("That file isn't a valid image.");
  const bucket = form.get("kind") === "logo" ? "brand-logos" : "report-images";
  const path = `${bucket}/${s.profile.id}/${Date.now().toString(36)}-${util.uid()}.${ext}`;
  await s.repo.putFile(path, bytes, file.type);
  const w = Math.max(1, Math.min(20000, parseInt(String(form.get("w"))) || 1200)), h = Math.max(1, Math.min(20000, parseInt(String(form.get("h"))) || 800));
  return ok({ path, w, h });
}
