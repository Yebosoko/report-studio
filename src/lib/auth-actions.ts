"use server";
/* Sign in, sign up, sign out and password reset, for both Supabase and local mode. */
import { redirect } from "next/navigation";
import { env, useSupabase } from "./env";

export interface ActionState { error?: string; ok?: string }
const safeNext = (n: FormDataEntryValue | null) => { const s = String(n || ""); return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard"; };
const str = (f: FormData, k: string) => String(f.get(k) || "").trim();

export async function signInAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email"), password = String(form.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };
  try {
    if (useSupabase) {
      const { supabaseUser } = await import("./supabase/server");
      const { error } = await (await supabaseUser()).auth.signInWithPassword({ email, password });
      if (error) return { error: error.message.includes("Invalid") ? "That email and password don't match. Check them and try again." : error.message };
    } else { const { localSignIn } = await import("./auth-local"); await localSignIn(email, password); }
  } catch (e: any) { return { error: e.message || "Sign-in failed." }; }
  redirect(safeNext(form.get("next")));
}

export async function signUpAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email"), password = String(form.get("password") || "");
  const meta = { name: str(form, "name"), organisation: str(form, "organisation"), job_role: str(form, "job_role") };
  if (!meta.name) return { error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (!form.get("terms")) return { error: "Accept the terms and privacy policy to create your account." };
  try {
    if (useSupabase) {
      const { supabaseUser } = await import("./supabase/server");
      const { data, error } = await (await supabaseUser()).auth.signUp({ email, password, options: { data: meta, emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard` } });
      if (error) return { error: error.message };
      if (!data.session) return { ok: "Check your inbox: we've sent a link to confirm your email address." };
    } else { const { localSignUp } = await import("./auth-local"); await localSignUp(email, password, meta); }
  } catch (e: any) { return { error: e.message || "Sign-up failed." }; }
  redirect("/dashboard");
}

export async function signOutAction() {
  if (useSupabase) { const { supabaseUser } = await import("./supabase/server"); await (await supabaseUser()).auth.signOut(); }
  else { const { localSignOut } = await import("./auth-local"); await localSignOut(); }
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email");
  if (!email) return { error: "Enter your email address." };
  if (useSupabase) {
    const { supabaseUser } = await import("./supabase/server");
    await (await supabaseUser()).auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password` });
  } else {
    const { localCreateResetToken } = await import("./auth-local");
    const t = localCreateResetToken(email);
    if (t) console.log(`[local mode] Password reset link for ${email}: ${env.siteUrl}/reset-password?token=${t}`);
  }
  return { ok: "If an account exists for that address, a reset link is on its way. Check your inbox." };
}

export async function resetPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get("password") || ""), confirm = String(form.get("confirm") || "");
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  try {
    if (useSupabase) {
      const { supabaseUser } = await import("./supabase/server");
      const { error } = await (await supabaseUser()).auth.updateUser({ password });
      if (error) return { error: error.message.includes("session") ? "This reset link has expired. Request a new one." : error.message };
    } else {
      const { localConsumeResetToken, localCurrentUserId, localUpdatePassword } = await import("./auth-local");
      const token = String(form.get("token") || "");
      const uid = token ? await localConsumeResetToken(token) : await localCurrentUserId();
      if (!uid) return { error: "This reset link has expired. Request a new one." };
      await localUpdatePassword(uid, password);
    }
  } catch (e: any) { return { error: e.message || "Couldn't update the password." }; }
  redirect("/dashboard?password=updated");
}

/** Google sign-in through Supabase (enable the Google provider in Supabase and set ENABLE_GOOGLE_SIGNIN=1). */
export async function googleSignInAction(form: FormData) {
  if (!useSupabase || !env.googleSignIn) redirect("/signin");
  const { supabaseUser } = await import("./supabase/server");
  const { data, error } = await (await supabaseUser()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}` } });
  if (error || !data.url) redirect("/signin?error=google");
  redirect(data.url);
}
