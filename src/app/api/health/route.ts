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
  // Shape hints (never the values): catch keys copied with hidden dots, or a URL with extra parts.
  const ascii = (v: string) => /^[\x21-\x7e]*$/.test(v);
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const hints = {
    supabaseUrl: !rawUrl ? "missing" : !/^https:\/\/[a-z0-9]+\.supabase\.co/.test(rawUrl) ? "should look like https://<project-ref>.supabase.co" : rawUrl.replace(/\/+$/, "") !== env.supabaseUrl ? "had extra text after .supabase.co (ignored now; better to remove it)" : "ok",
    anonKey: !env.supabaseAnonKey ? "missing" : !ascii(env.supabaseAnonKey) ? "contains hidden dots or spaces: copy it again with the copy button" : /^(eyJ|sb_publishable_)/.test(env.supabaseAnonKey) ? (env.supabaseAnonKey.startsWith("sb_secret_") ? "this is the SECRET key: use the publishable/anon key here" : "ok") : env.supabaseAnonKey.startsWith("sb_secret_") ? "this is the SECRET key: use the publishable/anon key here" : "doesn't look like an anon/publishable key",
    serviceKey: !env.supabaseServiceKey ? "missing" : !ascii(env.supabaseServiceKey) ? "contains hidden dots or spaces: copy it again with the copy button" : /^(eyJ|sb_secret_)/.test(env.supabaseServiceKey) ? (env.supabaseServiceKey === env.supabaseAnonKey ? "same as the anon key: use the secret/service_role key" : "ok") : "doesn't look like a secret/service_role key",
    anthropicKey: !env.anthropicKey ? "missing" : !ascii(env.anthropicKey) ? "contains hidden dots or spaces" : env.anthropicKey.startsWith("sk-ant-") ? "ok" : "doesn't start with sk-ant-"
  };
  if (useSupabase) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
      const lib = await anon.from("library_versions").select("version_no").eq("status", "published").maybeSingle();
      checks.publishedLibrary = lib.error ? `error: ${lib.error.message}` : lib.data ? `ok (version ${lib.data.version_no})` : "missing: run supabase/seed.sql";
      const plans = await anon.from("plans").select("id");
      checks.plans = plans.error ? `error: ${plans.error.message}` : `ok (${plans.data.length})`;
      if (env.supabaseServiceKey && hints.serviceKey === "ok") {
        const svc = createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
        const s = await svc.from("app_settings").select("id").limit(1);
        checks.serviceKey = s.error ? `error: ${s.error.message}` : "ok";
      }
    } catch (e: any) { checks.database = `error: ${e.message}`; }
  } else checks.database = "Supabase settings are missing, so the app is in local mode (not allowed in production).";
  const ok = Object.values(settings).every(Boolean) && Object.values(checks).every(v => v.startsWith("ok"));
  return NextResponse.json({ ok: ok && Object.values(hints).every(h => h === "ok" || h.startsWith("had extra")), settings, hints, checks }, { headers: { "Cache-Control": "no-store" } });
}
