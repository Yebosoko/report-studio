/* Change control (owner only): check, apply or discard the pending library change; roll back to an earlier version. */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { checkLibrary } from "@/lib/lab/check";

export const maxDuration = 120;
export async function POST(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const b = await body<{ action: string; versionId?: string; note?: string }>(req);
  const repo = s.repo; const cs = await repo.getPendingChangeSet(); const draft = await repo.getDraft();
  switch (b?.action) {
    case "check": {
      if (!draft) return bad("There's no draft to check.");
      const checks = await checkLibrary(draft.library);
      if (cs) await repo.saveChangeSet({ id: cs.id, checks });
      return ok({ checks });
    }
    case "apply": {
      if (!draft) return bad("There's no pending change to apply.");
      const checks = await checkLibrary(draft.library);
      if (checks.errors.length) { if (cs) await repo.saveChangeSet({ id: cs.id, checks }); return bad("The checks found problems, so nothing was published. Fix them first:\n- " + checks.errors.slice(0, 6).join("\n- "), 409); }
      const note = String(b.note || cs?.summary || "Library change").slice(0, 500);
      const v = await repo.publishDraft(note);
      if (cs) await repo.saveChangeSet({ id: cs.id, status: "applied", checks, libraryVersionId: v.id });
      await repo.audit(s.profile.id, "library.apply", v.id, { versionNo: v.versionNo, note });
      return ok({ version: v });
    }
    case "discard": {
      await repo.discardDraft();
      if (cs) await repo.saveChangeSet({ id: cs.id, status: "discarded" });
      await repo.audit(s.profile.id, "library.discard", cs?.id || "");
      return ok();
    }
    case "rollback": {
      if (!b.versionId) return bad("Choose a version.");
      const all = await repo.listVersions(200); const target = all.find(v => v.id === b.versionId);
      if (!target) return bad("That version wasn't found.", 404);
      // "Roll back to before this": republish the version published just before the chosen one.
      const older = all.filter(v => v.versionNo < target.versionNo && v.status !== "draft" && v.publishedAt).sort((a, c) => c.versionNo - a.versionNo)[0];
      if (!older) return bad("There's no earlier version to go back to.");
      const v = await repo.publishCopyOf(older.id, `Rolled back to version ${older.versionNo} (before version ${target.versionNo})`, "rollback");
      await repo.audit(s.profile.id, "library.rollback", v.id, { from: target.versionNo, to: older.versionNo });
      return ok({ version: v });
    }
  }
  return bad("Unknown action.");
}
