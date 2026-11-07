/* Keeps the Supabase session cookie fresh on every request, and is the first of three locks on the owner area:
   /admin/** and /api/admin/** answer 404 unless the signed-in email is OWNER_EMAIL. Pages and routes check again
   (src/lib/auth.ts), and row level security checks in the database. In local mode the page and route checks apply. */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  const p = request.nextUrl.pathname;
  const adminPath = p === "/admin" || p.startsWith("/admin/") || p.startsWith("/api/admin");
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers || {}).forEach(([k, v]) => response.headers.set(k, String(v)));
      }
    }
  });
  const { data } = await supabase.auth.getUser();
  if (adminPath) {
    const owner = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
    if (!owner || (data.user?.email || "").toLowerCase() !== owner) {
      return p.startsWith("/api/") ? NextResponse.json({ error: "Not found" }, { status: 404 }) : NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
    }
  }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|css|js|mjs|woff2?)$).*)"] };
