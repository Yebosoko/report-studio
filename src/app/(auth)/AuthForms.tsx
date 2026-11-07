"use client";
/* Client forms for sign in, sign up and password reset. They post to server actions; errors come back as plain sentences. */
import Link from "next/link";
import { useActionState, useState } from "react";
import { forgotPasswordAction, googleSignInAction, resetPasswordAction, signInAction, signUpAction, type ActionState } from "@/lib/auth-actions";

function Msg({ s }: { s: ActionState }) {
  if (s.error) return <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{s.error}</p>;
  if (s.ok) return <p role="status" className="rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-body-sm text-on-surface">{s.ok}</p>;
  return null;
}
function Google({ next }: { next: string }) {
  return (<>
    <div className="my-5 flex items-center gap-3 text-body-sm text-on-surface-variant"><span className="h-px flex-1 bg-outline-variant" />or<span className="h-px flex-1 bg-outline-variant" /></div>
    <form action={googleSignInAction}><input type="hidden" name="next" value={next} /><button className="btn w-full"><svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>Continue with Google</button></form>
  </>);
}

export function SignInForm({ next, google }: { next: string; google: boolean }) {
  const [s, act, pending] = useActionState(signInAction, {});
  return (<>
    <form action={act} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="email">Email</label><input className="field" id="email" name="email" type="email" autoComplete="email" required /></div>
      <div><div className="flex items-baseline justify-between"><label className="label" htmlFor="password">Password</label><Link href="/forgot-password" className="text-body-sm font-semibold text-primary hover:underline">Forgot password?</Link></div>
        <input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <Msg s={s} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
    {google && <Google next={next} />}
    <p className="mt-6 text-center text-body-sm text-on-surface-variant">New to Report Studio? <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link></p>
  </>);
}

const ROLES = ["Consultant", "Engineer", "Government officer", "NGO", "Student", "Other"];
function strength(p: string) { let n = 0; if (p.length >= 8) n++; if (p.length >= 12) n++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++; if (/\d/.test(p) || /[^\w]/.test(p)) n++; return n; }
export function SignUpForm({ google }: { google: boolean }) {
  const [s, act, pending] = useActionState(signUpAction, {});
  const [pw, setPw] = useState("");
  const st = strength(pw); const words = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return (<>
    <form action={act} className="space-y-4">
      <div><label className="label" htmlFor="name">Full name</label><input className="field" id="name" name="name" autoComplete="name" required /></div>
      <div><label className="label" htmlFor="email">Work email</label><input className="field" id="email" name="email" type="email" autoComplete="email" required /></div>
      <div><label className="label" htmlFor="password">Password</label><input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={e => setPw(e.target.value)} aria-describedby="pw-hint" />
        <div className="mt-2 flex gap-1" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} className={`h-1 flex-1 rounded ${i < st ? (st >= 3 ? "bg-tertiary" : "bg-secondary") : "bg-surface-container-high"}`} />)}</div>
        <p id="pw-hint" className="mt-1 text-body-sm text-on-surface-variant">{pw ? words[st] : "At least 8 characters"}</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="organisation">Organisation <span className="text-outline">(optional)</span></label><input className="field" id="organisation" name="organisation" autoComplete="organization" /></div>
        <div><label className="label" htmlFor="job_role">Role</label><select className="field" id="job_role" name="job_role" defaultValue="Consultant">{ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
      </div>
      <label className="flex items-start gap-2 text-body-sm text-on-surface-variant"><input type="checkbox" name="terms" className="mt-1" required />I agree to the <Link href="/terms" className="font-semibold text-primary hover:underline">terms</Link> and consent to my data being processed as described in the <Link href="/privacy" className="font-semibold text-primary hover:underline">privacy policy</Link>.</label>
      <Msg s={s} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
    {google && <Google next="/dashboard" />}
    <p className="mt-6 text-center text-body-sm text-on-surface-variant">Already have an account? <Link href="/signin" className="font-semibold text-primary hover:underline">Sign in</Link></p>
  </>);
}

export function ForgotForm() {
  const [s, act, pending] = useActionState(forgotPasswordAction, {});
  if (s.ok) return (<div className="text-center"><span className="icon text-[40px] text-primary" aria-hidden="true">mark_email_read</span><h2 className="mt-2 font-serif text-headline-sm">Check your inbox</h2><p className="mt-2 text-body-md text-on-surface-variant">{s.ok}</p><Link href="/signin" className="btn mt-6">Back to sign in</Link></div>);
  return (<form action={act} className="space-y-4">
    <div><label className="label" htmlFor="email">Email</label><input className="field" id="email" name="email" type="email" autoComplete="email" required /></div>
    <Msg s={s} /><button className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    <p className="text-center text-body-sm"><Link href="/signin" className="font-semibold text-primary hover:underline">Back to sign in</Link></p>
  </form>);
}

export function ResetForm({ token }: { token: string }) {
  const [s, act, pending] = useActionState(resetPasswordAction, {});
  return (<form action={act} className="space-y-4">
    <input type="hidden" name="token" value={token} />
    <div><label className="label" htmlFor="password">New password</label><input className="field" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
    <div><label className="label" htmlFor="confirm">Repeat the new password</label><input className="field" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></div>
    <Msg s={s} /><button className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
  </form>);
}
