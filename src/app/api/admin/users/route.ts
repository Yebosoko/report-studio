/* PATCH {id, planId?, status?} — change a member's plan or suspend/restore them (owner only). */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";

export async function PATCH(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const b = await body<{ id: string; planId?: string; status?: "active" | "suspended" }>(req);
  if (!b?.id) return bad("Choose a user.");
  if (b.id === s.profile.id && b.status === "suspended") return bad("You can't suspend the owner account.");
  const p = await s.repo.getProfile(b.id); if (!p) return bad("User not found.", 404);
  const patch: any = {};
  if (b.planId) { if (!(await s.repo.getPlan(b.planId))) return bad("Unknown plan."); patch.planId = b.planId; }
  if (b.status) { if (!["active", "suspended"].includes(b.status)) return bad("Unknown status."); patch.status = b.status; }
  await s.repo.adminUpdateProfile(b.id, patch);
  await s.repo.audit(s.profile.id, "user.update", b.id, patch);
  return ok();
}
