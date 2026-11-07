import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { env, useSupabase } from "@/lib/env";
import { AuthShell } from "../AuthShell";
import { SignInForm } from "../AuthForms";
export const metadata: Metadata = { title: "Sign in" };
const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");
export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await getSession().catch(() => null)) redirect(safe(sp.next));
  return <AuthShell title="Sign in">{sp.error && <p role="alert" className="mb-4 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">That sign-in link didn't work. Try again.</p>}<SignInForm next={safe(sp.next)} google={useSupabase && env.googleSignIn} /></AuthShell>;
}
