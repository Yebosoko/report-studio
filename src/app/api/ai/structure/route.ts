/* POST {templateId, draft, sections:[{title,hint}], onlyRemaining} — streams JSON Lines: {"meta":…} then one {"title","blocks"} per section.
   Errors after the stream starts arrive as a final {"error": "..."} line. */
import { isResponse } from "@/lib/auth";
import { bad, body } from "@/lib/api";
import { memberAIGate } from "@/lib/ai/member";
import { friendlyError, logUsage, streamText } from "@/lib/ai/claude";
import { MEMBER_SYSTEM, structurePrompt } from "@/lib/ai/prompts";
import { mockStructure } from "@/lib/ai/mock";

export const maxDuration = 300;
export async function POST(req: Request) {
  const g = await memberAIGate(); if (isResponse(g)) return g;
  const { s, settings } = g;
  const b = await body<any>(req);
  if (!b || typeof b.draft !== "string" || !b.draft.trim()) return bad("Paste or import your draft first.");
  const lib = (await s.repo.getPublished()).library;
  const t = lib.templates.find((x: any) => x.id === b.templateId); if (!t) return bad("Unknown template.");
  const sections = (Array.isArray(b.sections) ? b.sections : []).slice(0, 60).map((x: any) => ({ title: String(x?.title || "").slice(0, 200), hint: String(x?.hint || "").slice(0, 400) })).filter((x: any) => x.title);
  if (!sections.length) return bad("There are no sections to fill.");
  const prompt = structurePrompt({ docType: t.docType, sections, draft: b.draft, onlyRemaining: !!b.onlyRemaining, houseRules: lib.houseRules || [] });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      try {
        const usage = await streamText({ model: settings.memberModel, system: MEMBER_SYSTEM, prompt, signal: req.signal, onText: t => ctl.enqueue(enc.encode(t)), mock: () => mockStructure(sections, !!b.onlyRemaining) });
        await logUsage(s.repo, settings, s.profile.id, "member_structure", settings.memberModel, usage);
      } catch (e: any) {
        if (!req.signal.aborted) ctl.enqueue(enc.encode("\n" + JSON.stringify({ error: friendlyError(e) }) + "\n"));
      } finally { try { ctl.close(); } catch {} }
    }
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
