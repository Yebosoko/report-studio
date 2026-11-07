/* Shared gate for member AI routes: signed in, plan has AI (owner always), key configured, budget left, rate limit. */
import "server-only";
import { apiUser, isResponse, type Session } from "../auth";
import { planUsage } from "../reports";
import { AIError, aiAvailable, assertBudget, rateLimit } from "./claude";
import { NextResponse } from "next/server";
import type { Settings } from "../types";

export async function memberAIGate(): Promise<{ s: Session; settings: Settings } | NextResponse> {
  const s = await apiUser(); if (isResponse(s)) return s;
  const u = await planUsage(s.repo, s.profile);
  // Members whose plan lacks AI get the same answer as a missing route.
  if (!u.aiEnabled) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    if (!aiAvailable()) throw new AIError("AI isn't connected yet. The owner needs to add the Claude API key on the server.", 503);
    rateLimit("member:" + s.profile.id, 12, 60_000);
    const settings = await s.repo.getSettings();
    await assertBudget(s.repo, settings);
    return { s, settings };
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: e.status || 400 }); }
}
