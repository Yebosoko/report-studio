"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/client/useApi";
import { toast } from "@/editor/ui.js";
import { resetPasswordAction } from "@/lib/auth-actions";
import type { Plan, Profile } from "@/lib/types";

export function AccountForms({ profile, usage, plan, plans }: { profile: Profile; usage: { used: number; limit: number | null }; plan: Plan | null; plans: Plan[] }) {
  const router = useRouter();
  const [p, setP] = useState({ name: profile.name, organisation: profile.organisation, jobRole: profile.jobRole });
  const [busy, setBusy] = useState(false);
  const [pw, pwAct, pwBusy] = useActionState(resetPasswordAction, {});
  const [confirm, setConfirm] = useState(""); const [delOpen, setDelOpen] = useState(false);
  return (
    <div className="mt-8 space-y-6">
      <section className="card p-6" aria-labelledby="pr"><h2 id="pr" className="text-title-md">Profile</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="n">Full name</label><input id="n" className="field" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="em">Email</label><input id="em" className="field" value={profile.email} disabled /></div>
          <div><label className="label" htmlFor="o">Organisation</label><input id="o" className="field" value={p.organisation} onChange={e => setP({ ...p, organisation: e.target.value })} /></div>
          <div><label className="label" htmlFor="r">Role</label><input id="r" className="field" value={p.jobRole} onChange={e => setP({ ...p, jobRole: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary mt-4" disabled={busy} onClick={async () => { setBusy(true); try { await api("/api/account", { method: "PATCH", json: p }); toast("Profile saved."); router.refresh(); } catch (e: any) { toast(e.message); } setBusy(false); }}>Save profile</button>
      </section>

      <section className="card p-6" aria-labelledby="pw"><h2 id="pw" className="text-title-md">Password</h2>
        <form action={pwAct} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="np">New password</label><input id="np" name="password" type="password" className="field" minLength={8} autoComplete="new-password" required /></div>
          <div><label className="label" htmlFor="cp">Repeat new password</label><input id="cp" name="confirm" type="password" className="field" minLength={8} autoComplete="new-password" required /></div>
          {pw.error && <p role="alert" className="text-body-sm text-error sm:col-span-2">{pw.error}</p>}
          <div className="sm:col-span-2"><button className="btn" disabled={pwBusy}>{pwBusy ? "Saving…" : "Change password"}</button></div>
        </form>
      </section>

      <section id="billing" className="card scroll-mt-20 p-6" aria-labelledby="bl"><h2 id="bl" className="text-title-md">Plan and billing</h2>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-lg bg-surface-container-low p-4">
          <div><p className="micro">Current plan</p><p className="mt-1 font-serif text-headline-sm">{plan?.name || profile.planId}</p><p className="text-body-sm text-on-surface-variant">{usage.used} of {usage.limit ?? "unlimited"} reports this month</p></div>
          {plan && <p className="font-serif text-headline-sm tabular">{plan.priceNgn ? `₦${plan.priceNgn.toLocaleString("en-NG")} / month` : "Free"}</p>}
        </div>
        <p className="mt-4 text-body-md text-on-surface-variant">Online payment by card or bank transfer is being connected. To change plan now, contact the studio and your plan will be updated on your account.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{plans.map(x => <div key={x.id} className={`rounded-lg border p-3 ${x.id === profile.planId ? "border-primary-container" : "border-outline-variant"}`}><p className="text-title-sm">{x.name}</p><p className="text-body-sm text-on-surface-variant">{x.priceNgn ? `₦${x.priceNgn.toLocaleString("en-NG")} / month` : "Free"} · {x.reportLimit == null ? "unlimited reports" : `${x.reportLimit} reports a month`}</p></div>)}</div>
        <p className="micro mt-6">Invoices</p><p className="mt-1 text-body-sm text-on-surface-variant">No invoices yet.</p>
      </section>

      <section className="card p-6" aria-labelledby="dt"><h2 id="dt" className="text-title-md">Your data</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">Download everything stored for your account: profile, brand and every report, as a JSON file.</p>
        <a className="btn mt-4" href="/api/account" download>Download my data</a>
      </section>

      <section className="card border-error/40 p-6" aria-labelledby="dz"><h2 id="dz" className="text-title-md text-error">Delete my account and data</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">This permanently deletes your account, reports, images and brand kit. It can't be undone.</p>
        {!delOpen ? <button className="btn btn-danger mt-4" onClick={() => setDelOpen(true)}>Delete my account…</button> : (
          <div className="mt-4 max-w-md space-y-3">
            <label className="label" htmlFor="cf">Type <strong>{profile.email}</strong> to confirm</label>
            <input id="cf" className="field" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" />
            <div className="flex gap-2"><button className="btn" onClick={() => setDelOpen(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={confirm.trim().toLowerCase() !== profile.email.toLowerCase() || busy} onClick={async () => { setBusy(true); try { await api("/api/account", { method: "DELETE", json: { confirm } }); window.location.href = "/"; } catch (e: any) { toast(e.message); setBusy(false); } }}>Delete everything</button></div>
          </div>)}
      </section>
    </div>
  );
}
