/* GET a stored image. Users reach only their own folders (and the owner the samples bucket); in Supabase mode storage policies check again. */
import { getSession } from "@/lib/auth";
import { canAccessPath } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const s = await getSession().catch(() => null);
  if (!s) return new Response("Not found", { status: 404 });
  const p = (await params).path.map(decodeURIComponent).join("/");
  if (!canAccessPath(s.profile, p)) return new Response("Not found", { status: 404 });
  const f = await s.repo.getFile(p);
  if (!f) return new Response("Not found", { status: 404 });
  const type = /^image\/(png|jpeg|webp)$/.test(f.contentType) ? f.contentType : "application/octet-stream";
  return new Response(Buffer.from(f.bytes), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
