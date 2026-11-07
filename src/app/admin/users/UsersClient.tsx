"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client/useApi";
import { confirmBox, toast } from "@/editor/ui.js";
import type { Plan, Profile } from "@/lib/types";

export function UsersClient({ me, users, plans }: { me: string; users: Array<Profile & { reportsMonth: number }>; plans: Plan[] }) {
  const router = useRouter(); const [tab, setTab] = useState<"users" | "plans">("users"); const [q, setQ] = useState("");
  const list = users.filter(u => !q || `${u.name} ${u.email} ${u.organisation}`.toLowerCase().includes(q.toLowerCase()));
  async function patch(id: string, p: any, msg: string) { try { await api("/api/admin/users", { method: "PATCH", json: { id, ...p } }); toast(msg); router.refresh(); } catch (e: any) { toast(e.message); } }
  return (<>
    <div className="mb-5 flex gap-1 border-b border-outline-variant" role="tablist">{(["users", "plans"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-label-md capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>{t}</button>)}</div>
    {tab === "users" ? (<section className="card p-4">
      <input className="field max-w-sm" placeholder="Search name, email or organisation" value={q} onChange={e => setQ(e.target.value)} aria-label="Search users" />
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-body-sm">
        <thead><tr className="border-b border-outline-variant text-label-micro uppercase text-on-surface-variant"><th className="py-2 pr-3">Name</th><th className="pr-3">Email</th><th className="pr-3">Organisation</th><th className="pr-3">Plan</th><th className="pr-3">Reports (month)</th><th className="pr-3">Last active</th><th className="pr-3">Status</th><th></th></tr></thead>
        <tbody>{list.map(u => (
          <tr key={u.id} className="border-b border-outline-variant align-middle">
            <td className="py-2.5 pr-3 font-semibold">{u.name || "—"}{u.role === "owner" && <span className="badge ml-2 bg-secondary-fixed text-secondary">Owner</span>}</td>
            <td className="pr-3">{u.email}</td><td className="pr-3">{u.organisation || "—"}</td>
            <td className="pr-3"><select className="field py-1" value={u.planId} disabled={u.role === "owner"} onChange={e => patch(u.id, { planId: e.target.value }, "Plan changed.")} aria-label={`Plan for ${u.email}`}>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
            <td className="pr-3 tabular">{u.reportsMonth}</td>
            <td className="pr-3">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</td>
            <td className="pr-3"><span className={`badge ${u.status === "active" ? "bg-tertiary-fixed text-tertiary" : "bg-error-container text-on-error-container"}`}>{u.status}</span></td>
            <td className="text-right">{u.id !== me && (u.status === "active"
              ? <button className="btn btn-sm btn-ghost btn-danger" onClick={async () => { if (await confirmBox(`Suspend ${u.email}?`, "They won't be able to open the workspace until you restore them. Their reports are kept.", "Suspend", "Cancel", true)) patch(u.id, { status: "suspended" }, "Suspended."); }}>Suspend</button>
              : <button className="btn btn-sm" onClick={() => patch(u.id, { status: "active" }, "Restored.")}>Restore</button>)}</td>
          </tr>))}</tbody></table></div>
      <p className="mt-3 text-body-sm text-on-surface-variant">Members export their own data from their Account page. You can't open members&apos; reports.</p>
    </section>) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">{plans.map(p => <PlanCard key={p.id} plan={p} onSaved={() => router.refresh()} />)}</div>)}
  </>);
}

function PlanCard({ plan, onSaved }: { plan: Plan; onSaved(): void }) {
  const [p, setP] = useState(plan); const [busy, setBusy] = useState(false); const dirty = JSON.stringify(p) !== JSON.stringify(plan);
  const num = (v: string) => (v === "" ? null : Number(v));
  async function save(next = p) { setBusy(true); try { await api("/api/admin/plans", { method: "PUT", json: { plan: next } }); toast("Plan saved."); onSaved(); } catch (e: any) { toast(e.message); } setBusy(false); }
  return (<section className="card space-y-3 p-5" aria-label={plan.name}>
    <input className="field font-serif text-title-md" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} aria-label="Plan name" />
    <textarea className="field min-h-[60px] text-body-sm" value={p.description} onChange={e => setP({ ...p, description: e.target.value })} aria-label="Description" />
    <div className="grid grid-cols-2 gap-2">
      <label><span className="label">Price ₦ / month</span><input type="number" className="field" value={p.priceNgn} onChange={e => setP({ ...p, priceNgn: Number(e.target.value) })} /></label>
      <label><span className="label">Price $ / month</span><input type="number" className="field" value={p.priceUsd} onChange={e => setP({ ...p, priceUsd: Number(e.target.value) })} /></label>
      <label><span className="label">Reports / month</span><input type="number" className="field" placeholder="Unlimited" value={p.reportLimit ?? ""} onChange={e => setP({ ...p, reportLimit: num(e.target.value) })} /></label>
      <label><span className="label">Templates</span><input type="number" className="field" placeholder="All" value={p.templateLimit ?? ""} onChange={e => setP({ ...p, templateLimit: num(e.target.value) })} /></label>
    </div>
    <label className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3"><span><span className="block text-title-sm">Members can use Structure with AI</span><span className="text-body-sm text-on-surface-variant">Also enables Refine with AI. Uses your Claude budget.</span></span>
      <input type="checkbox" role="switch" className="h-5 w-5" checked={p.aiEnabled} onChange={e => { const next = { ...p, aiEnabled: e.target.checked }; setP(next); save(next); }} /></label>
    <label className="flex items-center gap-2 text-body-sm"><input type="checkbox" checked={p.active} onChange={e => setP({ ...p, active: e.target.checked })} />Offered on the pricing page</label>
    <button className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={() => save()}>Save plan</button>
  </section>);
}
