/* POST /api/reports — create a report from a template ({templateId}) or the example ({example: true}). The owner can pass draft: true. */
import { apiUser, isOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { allowedTemplateIds, blankReport, exampleReport, planUsage } from "@/lib/reports";

export async function POST(req: Request) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const b = await body<{ templateId?: string; example?: boolean; draft?: boolean }>(req) || {};
  // The owner may start a report from the draft library to try pending Studio Lab changes.
  const draft = b.draft && isOwner(s.profile) ? await s.repo.getDraft() : null;
  const lib = (draft || await s.repo.getPublished()).library;
  const u = await planUsage(s.repo, s.profile);
  if (!u.canCreate) return bad(`Your ${u.plan?.name || ""} plan includes ${u.limit} new reports a month, and you've used them. Upgrade on the Account page for more.`, 402);
  let rep;
  if (b.example) rep = exampleReport(lib);
  else {
    if (!b.templateId || !lib.templates.some((t: any) => t.id === b.templateId)) return bad("Choose a template from the library.");
    if (!allowedTemplateIds(lib, u.templateLimit).has(b.templateId)) return bad("That template isn't included in your plan. Upgrade on the Account page to use every template.", 402);
    rep = blankReport(lib, b.templateId, await s.repo.getBrand(s.profile.id));
  }
  const id = await s.repo.createReport(s.profile.id, rep, "");
  await s.repo.logEvent(s.profile.id, "report_created", { templateId: rep.templateId, example: !!b.example }).catch(() => {});
  return ok({ id });
}
