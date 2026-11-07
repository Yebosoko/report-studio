/* POST {templateId, title, instruction, hint, section, draft} — returns the revised section {title, blocks}. */
import { isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { memberAIGate } from "@/lib/ai/member";
import { complete, friendlyError, logUsage } from "@/lib/ai/claude";
import { MEMBER_SYSTEM, parseJSONObject, refinePrompt } from "@/lib/ai/prompts";
import { mockRefine } from "@/lib/ai/mock";

export const maxDuration = 120;
export async function POST(req: Request) {
  const g = await memberAIGate(); if (isResponse(g)) return g;
  const { s, settings } = g;
  const b = await body<any>(req);
  if (!b || !String(b.instruction || "").trim()) return bad("Choose a suggestion or type an instruction.");
  if (!b.section || !Array.isArray(b.section.blocks)) return bad("The section is missing.");
  if (JSON.stringify(b.section).length > 400_000) return bad("This section is too large to refine in one pass.");
  const lib = (await s.repo.getPublished()).library;
  const t = lib.templates.find((x: any) => x.id === b.templateId); if (!t) return bad("Unknown template.");
  try {
    const r = await complete({ model: settings.memberModel, system: MEMBER_SYSTEM, maxTokens: 16000, signal: req.signal,
      prompt: refinePrompt({ docType: t.docType, title: String(b.title || "").slice(0, 300), instruction: String(b.instruction).slice(0, 2000), hint: String(b.hint || "").slice(0, 400), section: b.section, draft: String(b.draft || ""), houseRules: lib.houseRules || [] }),
      mock: () => mockRefine(b.section, String(b.instruction)) });
    await logUsage(s.repo, settings, s.profile.id, "member_refine", settings.memberModel, r.usage);
    const o = parseJSONObject(r.text);
    if (!o || !Array.isArray(o.blocks)) return bad("The answer came back in the wrong format. Try again.", 502);
    return ok({ title: typeof o.title === "string" ? o.title : undefined, blocks: o.blocks });
  } catch (e: any) { return bad(friendlyError(e), e.status && e.status < 600 ? e.status : 502); }
}
