/* POST {type} — records product events used on the admin overview (only known types). */
import { apiUser, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";

const TYPES = new Set(["word_export"]);
export async function POST(req: Request) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const b = await body<{ type: string; detail?: any }>(req);
  if (!b || !TYPES.has(b.type)) return bad("Unknown event.");
  await s.repo.logEvent(s.profile.id, b.type, b.detail && typeof b.detail === "object" ? { templateId: String(b.detail.templateId || "").slice(0, 40) } : null);
  return ok();
}
