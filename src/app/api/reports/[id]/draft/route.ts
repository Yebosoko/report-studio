/* PUT the pasted draft text kept beside a report. */
import { apiUser, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const { id } = await params; const b = await body<{ text: string }>(req);
  if (typeof b?.text !== "string") return bad("Missing draft text.");
  if (b.text.length > 2_000_000) return bad("That draft is too long to keep. Split it into parts.");
  if (!(await s.repo.getReport(s.profile.id, id))) return bad("Report not found.", 404);
  await s.repo.updateDraft(s.profile.id, id, b.text);
  return ok();
}
