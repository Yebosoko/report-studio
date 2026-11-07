/* PUT {library, note} — the template and cover builder saves the whole draft library (owner only). Validated before saving. */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { validateLibrary } from "@/engine/library.js";
import { libraryDiff, checkLibrary } from "@/lib/lab/check";

export const maxDuration = 120;
export async function PUT(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const b = await body<{ library: any; note?: string; steps?: string[] }>(req);
  if (!b?.library) return bad("Missing library.");
  if (JSON.stringify(b.library).length > 3_000_000) return bad("The library is too large.");
  const v = validateLibrary(b.library);
  if (v.errors.length) return bad("Not saved. Fix these first:\n- " + v.errors.slice(0, 12).join("\n- "), 422);
  const draft = await s.repo.saveDraft(b.library, String(b.note || "Builder change").slice(0, 300), "owner");
  const pub = await s.repo.getPublished();
  const diff = libraryDiff(pub.library, draft.library);
  const cur = await s.repo.getPendingChangeSet();
  if (diff.length) {
    const checks = await checkLibrary(draft.library);
    await s.repo.saveChangeSet({ ...(cur ? { id: cur.id } : { kind: "library", status: "pending" }), summary: diff.map(d => `${d.kind} ${d.name} ${d.change}`).join(" · ").slice(0, 500), steps: [...(cur?.steps || []), ...(b.steps || ["Edited in the builder"])].slice(-200), checks, libraryVersionId: draft.id });
  } else if (cur) { await s.repo.discardDraft(); await s.repo.saveChangeSet({ id: cur.id, status: "discarded" }); }
  await s.repo.audit(s.profile.id, "library.builder_save", draft.id, { changes: diff.length });
  return ok({ warnings: v.warnings, changes: diff.length });
}
