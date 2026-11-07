/* Small helpers for API routes. */
import { NextResponse } from "next/server";
import type { Profile } from "./types";

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const ok = (data: any = { ok: true }) => NextResponse.json(data);
export async function body<T = any>(req: Request): Promise<T | null> { try { return await req.json(); } catch { return null; } }

const BUCKETS = ["report-images", "brand-logos", "samples"];
/** Which stored files a user may read or write: their own folder in report-images and brand-logos; the owner also reaches samples. */
export function canAccessPath(p: Profile, path: string): boolean {
  if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) return false;
  const [bucket, folder] = path.split("/");
  if (!BUCKETS.includes(bucket)) return false;
  if (bucket === "samples") return p.role === "owner";
  return folder === p.id;
}
export const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
