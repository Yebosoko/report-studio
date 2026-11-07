/* Environment. Supabase is used when its URL and anon key are set; otherwise the app runs on the local file store.
   Values are tidied because they're pasted by hand: spaces and quotes are trimmed, and the Supabase URL is cut back
   to its origin (https://<ref>.supabase.co) if a path such as /rest/v1/ was copied with it. */
const clean = (v?: string) => (v || "").trim().replace(/^["']|["']$/g, "").trim();
export function originOf(v?: string) { const c = clean(v); if (!c) return ""; try { return new URL(c).origin; } catch { return c.replace(/\/+$/, ""); } }
export const env = {
  supabaseUrl: originOf(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  ownerEmail: (process.env.OWNER_EMAIL || "").trim().toLowerCase(),
  anthropicKey: clean(process.env.ANTHROPIC_API_KEY),
  aiMock: process.env.AI_MOCK === "1",
  siteUrl: originOf(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET || "",
  allowLocalInProduction: process.env.ALLOW_LOCAL_MODE === "1",
  googleSignIn: process.env.ENABLE_GOOGLE_SIGNIN === "1"
};
export const useSupabase = !!(env.supabaseUrl && env.supabaseAnonKey);
export function assertConfigured() {
  if (!useSupabase && process.env.NODE_ENV === "production" && !env.allowLocalInProduction)
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see README).");
  if (useSupabase && !env.supabaseServiceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing (see README).");
  if (!env.ownerEmail) throw new Error("OWNER_EMAIL is not set. Set it to the email address of the studio owner (see README).");
}
