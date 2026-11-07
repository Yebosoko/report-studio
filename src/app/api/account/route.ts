/* GET exports the user's data as JSON; PATCH updates profile fields; DELETE removes the account and all its data. */
import { NextResponse } from "next/server";
import { apiUser, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";
import { useSupabase } from "@/lib/env";

export async function GET() {
  const s = await apiUser(); if (isResponse(s)) return s;
  const list = await s.repo.listReports(s.profile.id);
  const reports = []; for (const r of list) reports.push(await s.repo.getReport(s.profile.id, r.id));
  const data = { exportedAt: new Date().toISOString(), profile: s.profile, brand: await s.repo.getBrand(s.profile.id), reports };
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="report-studio-export.json"` } });
}
export async function PATCH(req: Request) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const b = await body<any>(req); if (!b) return bad("Missing details.");
  const str = (v: any) => String(v ?? "").trim().slice(0, 200);
  await s.repo.updateOwnProfile(s.profile.id, { name: str(b.name), organisation: str(b.organisation), jobRole: str(b.jobRole) });
  return ok();
}
export async function DELETE(req: Request) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const b = await body<{ confirm: string }>(req);
  if ((b?.confirm || "").trim().toLowerCase() !== s.profile.email.toLowerCase()) return bad("Type your email address to confirm.");
  if (s.profile.role === "owner") return bad("The owner account can't be deleted from here. Change OWNER_EMAIL first.");
  await s.repo.deleteUserData(s.profile.id);
  await s.repo.audit(s.profile.id, "account.delete", s.profile.id).catch(() => {});
  if (useSupabase) { const { supabaseUser } = await import("@/lib/supabase/server"); await (await supabaseUser()).auth.signOut().catch(() => {}); }
  else { const { localSignOut } = await import("@/lib/auth-local"); await localSignOut(); }
  return ok();
}
