/* PUT AI settings (owner only): models, monthly budget, stop-at-cap, prices per million tokens, naira rate. */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { MODEL_CHOICES } from "@/lib/types";

const MODEL_RE = /^claude-[a-z0-9.\-]{3,60}$/;
export async function PUT(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const b = await body<any>(req); if (!b) return bad("Missing settings.");
  const patch: any = {};
  for (const k of ["labModel", "memberModel", "studyModel"]) if (b[k] !== undefined) { const m = String(b[k]).trim(); if (!MODEL_RE.test(m)) return bad(`"${m}" isn't a Claude model id. Examples: ${MODEL_CHOICES.join(", ")}.`); patch[k] = m; }
  if (b.monthlyBudgetUsd !== undefined) patch.monthlyBudgetUsd = Math.max(0, Number(b.monthlyBudgetUsd) || 0);
  if (b.stopAtCap !== undefined) patch.stopAtCap = !!b.stopAtCap;
  if (b.ngnPerUsd !== undefined) patch.ngnPerUsd = Math.max(0, Number(b.ngnPerUsd) || 0);
  if (b.prices && typeof b.prices === "object") { patch.prices = {}; for (const [m, p] of Object.entries<any>(b.prices)) if (MODEL_RE.test(m)) patch.prices[m] = { in: Math.max(0, Number(p?.in) || 0), out: Math.max(0, Number(p?.out) || 0) }; }
  const saved = await s.repo.saveSettings(patch);
  await s.repo.audit(s.profile.id, "settings.update", "ai", patch);
  return ok({ settings: saved });
}
