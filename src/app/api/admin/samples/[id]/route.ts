/* One sample (owner only): POST {action: "study"} runs Claude's design study; PATCH edits details; DELETE removes it and its pages. */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { aiAvailable, friendlyError } from "@/lib/ai/claude";
import { studySample } from "@/lib/lab/study";

export const maxDuration = 180;
type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Ctx) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const { id } = await params; const smp = await s.repo.getSample(id); if (!smp) return bad("Sample not found.", 404);
  const b = await body<{ action: string }>(req); if (b?.action !== "study") return bad("Unknown action.");
  if (!aiAvailable()) return bad("Claude isn't connected yet. Add ANTHROPIC_API_KEY to the server settings.", 503);
  try {
    const study = await studySample(s.repo, s.profile, await s.repo.getSettings(), smp);
    const saved = await s.repo.saveSample({ ...smp, study, studyError: null });
    await s.repo.audit(s.profile.id, "sample.study", id);
    return ok({ sample: saved });
  } catch (e: any) {
    const msg = e.message && !e.status ? e.message : friendlyError(e);
    await s.repo.saveSample({ ...smp, studyError: msg });
    return bad(msg, e.status && e.status < 600 ? e.status : 502);
  }
}
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const { id } = await params; const smp = await s.repo.getSample(id); if (!smp) return bad("Sample not found.", 404);
  const b = await body<any>(req) || {};
  const saved = await s.repo.saveSample({ ...smp, name: String(b.name ?? smp.name).slice(0, 300) || smp.name, organisation: String(b.organisation ?? smp.organisation).slice(0, 120), notes: String(b.notes ?? smp.notes).slice(0, 2000) });
  return ok({ sample: saved });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const { id } = await params; const smp = await s.repo.getSample(id); if (!smp) return bad("Sample not found.", 404);
  await s.repo.deleteSample(id); await s.repo.removeFiles(smp.pages.map(p => p.path)).catch(() => {});
  await s.repo.audit(s.profile.id, "sample.delete", id);
  return ok();
}
