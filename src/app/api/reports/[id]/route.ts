/* PUT saves the report body (autosave); DELETE removes the report and its images. Only the author reaches either. */
import { apiUser, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { validateBody } from "@/lib/reports";

type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Ctx) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const { id } = await params; const b = await body<{ body: any }>(req);
  const err = validateBody(b?.body); if (err) return bad(err);
  if (!(await s.repo.getReport(s.profile.id, id))) return bad("Report not found.", 404);
  const updatedAt = await s.repo.updateReport(s.profile.id, id, b!.body);
  return ok({ updatedAt });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const { id } = await params; const r = await s.repo.getReport(s.profile.id, id);
  if (!r) return bad("Report not found.", 404);
  const brandLogo = (await s.repo.getBrand(s.profile.id)).logo?.path;
  const paths = Object.values<any>(r.body?.images || {}).map(x => x?.path).filter((p: string) => p && p.startsWith(`report-images/${s.profile.id}/`) && p !== brandLogo);
  await s.repo.deleteReport(s.profile.id, id);
  if (paths.length) await s.repo.removeFiles(paths).catch(() => {});
  return ok();
}
