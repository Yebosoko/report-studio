/* POST copies a report (and its draft) into a new report owned by the same user. Image files are shared by reference. */
import { apiUser, isResponse } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { planUsage } from "@/lib/reports";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const { id } = await params; const r = await s.repo.getReport(s.profile.id, id);
  if (!r) return bad("Report not found.", 404);
  const u = await planUsage(s.repo, s.profile);
  if (!u.canCreate) return bad(`You've used this month's ${u.limit} reports on the ${u.plan?.name || ""} plan. Upgrade on the Account page for more.`, 402);
  const b = JSON.parse(JSON.stringify(r.body)); b.meta = b.meta || {}; b.meta.title = (b.meta.title || "Untitled") + " (copy)"; b.isExample = false;
  const newId = await s.repo.createReport(s.profile.id, b, r.draftText || "");
  return ok({ id: newId });
}
