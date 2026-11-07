/* Who is signed in, and what they may do. Owner = the account whose email equals OWNER_EMAIL.
   Pages: requireUser() / requireOwnerPage(). API routes: apiUser() / apiOwner() return a Response to send when access fails.
   Admin pages and routes answer 404 to anyone but the owner, so the area's existence isn't revealed. */
import { redirect, notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { env, useSupabase } from "./env";
import { getRepo, type Repo } from "./repo";
import type { Profile } from "./types";

export interface Session { profile: Profile; repo: Repo }

async function currentUserId(): Promise<string | null> {
  if (!useSupabase) { const { localCurrentUserId } = await import("./auth-local"); return localCurrentUserId(); }
  const { supabaseUser } = await import("./supabase/server");
  const sb = await supabaseUser();
  const { data } = await sb.auth.getUser();
  return data.user?.id || null;
}

/** The signed-in user's profile (creating it if needed and granting the owner role to OWNER_EMAIL), or null. */
export async function getSession(): Promise<Session | null> {
  const uid = await currentUserId(); if (!uid) return null;
  const repo = await getRepo();
  let profile = await repo.getProfile(uid);
  if (!profile && useSupabase) {
    // The database trigger normally creates the profile; create it here if the trigger wasn't installed.
    const { supabaseService, supabaseUser } = await import("./supabase/server");
    const { data } = await (await supabaseUser()).auth.getUser();
    if (data.user) { await supabaseService().from("profiles").upsert({ id: uid, email: data.user.email || "", name: (data.user.user_metadata as any)?.name || "" }); profile = await repo.getProfile(uid); }
  }
  if (!profile) return null;
  if (env.ownerEmail && profile.email.toLowerCase() === env.ownerEmail && profile.role !== "owner") {
    await grantOwner(profile.id);
    profile = { ...profile, role: "owner" };
  }
  return { profile, repo };
}
async function grantOwner(id: string) {
  if (useSupabase) { const { supabaseService } = await import("./supabase/server"); await supabaseService().from("profiles").update({ role: "owner", plan_id: "firm" }).eq("id", id); }
  else { const { readDB, writeDB } = await import("./repo/local"); const d = readDB(); const p = d.profiles.find(x => x.id === id); if (p) { p.role = "owner"; p.planId = "firm"; writeDB(d); } }
}

export async function requireUser(next = "/dashboard"): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/signin?next=${encodeURIComponent(next)}`);
  if (s.profile.status === "suspended") redirect("/suspended");
  return s;
}
export async function requireOwnerPage(): Promise<Session> {
  const s = await getSession();
  if (!s || s.profile.role !== "owner" || s.profile.status !== "active") notFound();
  return s;
}
export const isOwner = (p?: Profile | null) => !!p && p.role === "owner" && p.status === "active";

export async function apiUser(): Promise<Session | NextResponse> {
  const s = await getSession().catch(() => null);
  if (!s) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (s.profile.status === "suspended") return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  return s;
}
export async function apiOwner(): Promise<Session | NextResponse> {
  const s = await getSession().catch(() => null);
  if (!s || !isOwner(s.profile)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return s;
}
export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;

/** Data the signed-in header needs: for the owner, how many Studio Lab changes are waiting. */
export async function pendingCount(s: Session): Promise<number> {
  if (!isOwner(s.profile)) return 0;
  const cs = await s.repo.getPendingChangeSet().catch(() => null);
  return cs ? 1 : 0;
}
