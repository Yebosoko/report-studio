/* Supabase email links (confirm sign-up, reset password) land here with a code that becomes a session. */
import { NextResponse, type NextRequest } from "next/server";
import { useSupabase } from "@/lib/env";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (useSupabase && code) {
    const { supabaseUser } = await import("@/lib/supabase/server");
    const { error } = await (await supabaseUser()).auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/signin?error=link", url.origin));
  }
  return NextResponse.redirect(new URL(safe, url.origin));
}
