import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "../env";

/** Supabase client acting as the signed-in user (row level security applies). One per request. */
export async function supabaseUser() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component: middleware refreshes the session */ } }
    }
  });
}
/** Service-role client. Server only; never exposed to the browser. */
export function supabaseService() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
