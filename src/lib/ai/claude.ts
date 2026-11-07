/* Server-only access to Claude. The API key comes from ANTHROPIC_API_KEY and never leaves the server.
   AI_MOCK=1 replaces Claude with scripted answers so the app can be tested without a key or spend. */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import type { Repo } from "../repo/types";
import type { Settings } from "../types";

let client: Anthropic | null = null;
export function claude(): Anthropic {
  if (!env.anthropicKey) throw new AIError("Claude isn't connected yet. Add ANTHROPIC_API_KEY to the server settings.", 503);
  if (!client) client = new Anthropic({ apiKey: env.anthropicKey });
  return client;
}
export const aiAvailable = () => env.aiMock || !!env.anthropicKey;

export class AIError extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

/** Turn SDK errors into plain sentences for the screen. Never includes keys or request bodies. */
export function friendlyError(e: any): string {
  if (e instanceof AIError) return e.message;
  const s = e?.status;
  if (s === 401 || s === 403) return "Claude rejected the server's API key. Check ANTHROPIC_API_KEY.";
  if (s === 429) return "Claude is rate-limiting requests just now. Wait a minute and try again.";
  if (s === 529 || s === 503) return "Claude is overloaded just now. Try again shortly.";
  if (s === 400 && /prompt is too long|too many tokens/i.test(e?.message || "")) return "That's too much text for one pass. Split it and work on part at a time.";
  if (e?.name === "AbortError") return "Stopped.";
  return "Something interrupted the request to Claude. Try again.";
}

/* ---------- Budget and usage ---------- */
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };
export function costOf(settings: Settings, model: string, inTok: number, outTok: number): number {
  const p = settings.prices?.[model]; if (!p) return 0;
  return (inTok * (p.in || 0) + outTok * (p.out || 0)) / 1_000_000;
}
export async function monthSpend(repo: Repo) {
  const rows = await repo.usageSince(monthStart());
  return { rows, usd: rows.reduce((a, r) => a + (r.costUsd || 0), 0) };
}
/** Throws when the owner's monthly cap is reached and "stop at cap" is on. */
export async function assertBudget(repo: Repo, settings: Settings) {
  if (!settings.stopAtCap || !settings.monthlyBudgetUsd) return;
  const { usd } = await monthSpend(repo);
  if (usd >= settings.monthlyBudgetUsd) throw new AIError("This month's AI budget has been reached. AI features resume next month, or when the owner raises the cap.", 402);
}
export async function logUsage(repo: Repo, settings: Settings, userId: string | null, feature: string, model: string, usage: { input_tokens?: number; output_tokens?: number } | undefined) {
  const inTok = usage?.input_tokens || 0, outTok = usage?.output_tokens || 0;
  await repo.logUsage({ userId, feature, model, inputTokens: inTok, outputTokens: outTok, costUsd: costOf(settings, model, inTok, outTok) }).catch(e => console.warn("usage log failed", e?.message));
}

/* ---------- Rate limiting (best effort, per server instance) ---------- */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(); const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) throw new AIError("Too many AI requests in a short time. Wait a minute and try again.", 429);
  arr.push(now); hits.set(key, arr);
}

/* ---------- Calls ---------- */
export interface TextResult { text: string; usage: { input_tokens: number; output_tokens: number } }

/** One non-streaming call that returns text. */
export async function complete(o: { model: string; system: string; prompt: string | Anthropic.MessageParam["content"]; maxTokens?: number; signal?: AbortSignal; mock?: () => string }): Promise<TextResult> {
  if (env.aiMock) return { text: o.mock ? o.mock() : "{}", usage: { input_tokens: 0, output_tokens: 0 } };
  const msg = await claude().messages.create({ model: o.model, max_tokens: o.maxTokens || 8000, system: o.system, messages: [{ role: "user", content: o.prompt as any }] }, { signal: o.signal });
  const text = msg.content.map((b: any) => (b.type === "text" ? b.text : "")).join("");
  return { text, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens } };
}

/** Streaming call: onText receives each text delta. Resolves with the usage totals. */
export async function streamText(o: { model: string; system: string; prompt: string; maxTokens?: number; signal?: AbortSignal; onText: (t: string) => void; mock?: () => string[] }) {
  if (env.aiMock) {
    for (const chunk of o.mock ? o.mock() : []) { if (o.signal?.aborted) break; o.onText(chunk); await new Promise(r => setTimeout(r, 40)); }
    return { input_tokens: 0, output_tokens: 0 };
  }
  const stream = await claude().messages.create({ model: o.model, max_tokens: o.maxTokens || 32000, system: o.system, stream: true, messages: [{ role: "user", content: o.prompt }] }, { signal: o.signal });
  let input = 0, output = 0;
  for await (const ev of stream as any) {
    if (ev.type === "message_start") input = ev.message?.usage?.input_tokens || 0;
    else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") o.onText(ev.delta.text);
    else if (ev.type === "message_delta" && ev.usage) output = ev.usage.output_tokens || output;
  }
  return { input_tokens: input, output_tokens: output };
}
