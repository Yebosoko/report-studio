/* GET /api/health — a setup check. Says which settings are present (never their values) and whether the database answers. */
import { NextResponse } from "next/server";
import { env, useSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export async function GET() {
  const settings = {
    OWNER_EMAIL: !!env.ownerEmail, NEXT_PUBLIC_SUPABASE_URL: !!env.supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: !!env.supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: !!env.supabaseServiceKey, ANTHROPIC_API_KEY: !!env.anthropicKey, NEXT_PUBLIC_SITE_URL: env.siteUrl
  };
  const checks: Record<string, string> = {};
  if (useSupabase) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
      const lib = await anon.from("library_versions").select("version_no").eq("status", "published").maybeSingle();
      checks.publishedLibrary = lib.error ? `error: ${lib.error.message}` : lib.data ? `ok (version ${lib.data.version_no})` : "missing: run supabase/seed.sql";
      const plans = await anon.from("plans").select("id");
      checks.plans = plans.error ? `error: ${plans.error.message}` : `ok (${plans.data.length})`;
      if (env.supabaseServiceKey) {
        const svc = createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
        const s = await svc.from("app_settings").select("id").limit(1);
        checks.serviceKey = s.error ? `error: ${s.error.message}` : "ok";
      }
    } catch (e: any) { checks.database = `error: ${e.message}`; }
  } else checks.database = "Supabase settings are missing, so the app is in local mode (not allowed in production).";
  const ok = Object.values(settings).every(Boolean) && Object.values(checks).every(v => v.startsWith("ok"));
  return NextResponse.json({ ok, settings, checks }, { headers: { "Cache-Control": "no-store" } });
}
