/* Studio Lab (owner only). GET the conversation; POST a request (streams NDJSON events); DELETE clears the conversation. */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { aiAvailable, assertBudget, rateLimit } from "@/lib/ai/claude";
import { runLab, type LabImage } from "@/lib/lab/agent";

export const maxDuration = 300;
export async function GET() { const s = await apiOwner(); if (isResponse(s)) return s; return ok(await s.repo.getThread()); }
export async function DELETE() { const s = await apiOwner(); if (isResponse(s)) return s; await s.repo.saveThread({ turns: [], pending: null }); return ok(); }

const TYPES = ["image/png", "image/jpeg", "image/webp"];
export async function POST(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const b = await body<{ message?: string; images?: LabImage[]; sampleId?: string; continue?: boolean }>(req);
  if (!b) return bad("Missing request.");
  const message = String(b.message || "").trim().slice(0, 8000);
  if (!message && !b.continue) return bad("Type what you'd like to change.");
  const images = (Array.isArray(b.images) ? b.images : []).slice(0, 6).filter(i => i && TYPES.includes(i.media_type) && typeof i.data === "string" && i.data.length < 6_000_000);
  if (!aiAvailable()) return bad("Claude isn't connected yet. Add ANTHROPIC_API_KEY to the server settings.", 503);
  const settings = await s.repo.getSettings();
  try { rateLimit("lab:" + s.profile.id, 10, 60_000); await assertBudget(s.repo, settings); } catch (e: any) { return bad(e.message, e.status || 400); }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const emit = (e: any) => { try { ctl.enqueue(enc.encode(JSON.stringify(e) + "\n")); } catch {} };
      try { await runLab({ repo: s.repo, profile: s.profile, settings, message, images, sampleId: b.sampleId ? String(b.sampleId) : undefined, continuing: !!b.continue, signal: req.signal, emit }); }
      finally { try { ctl.close(); } catch {} }
    }
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
