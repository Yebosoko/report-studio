"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client/useApi";
import { toast } from "@/editor/ui.js";
import { MODEL_CHOICES, type Settings } from "@/lib/types";

const FEATURES: Record<string, string> = { lab: "Studio Lab", sample_study: "Sample studies", member_structure: "Member: Structure with AI", member_refine: "Member: Refine with AI" };
export function AISettings({ settings, usage, connected, mock, rules }: { settings: Settings; usage: Record<string, { requests: number; tokens: number; usd: number }>; connected: boolean; mock: boolean; rules: string[] }) {
  const router = useRouter();
  const [s, setS] = useState(settings); const [busy, setBusy] = useState(false);
  const [r, setR] = useState(rules.join("\n"));
  const total = Object.values(usage).reduce((a, x) => a + x.usd, 0); const pct = s.monthlyBudgetUsd ? Math.min(100, (total / s.monthlyBudgetUsd) * 100) : 0;
  const models = Array.from(new Set([...MODEL_CHOICES, s.labModel, s.memberModel, s.studyModel]));
  async function save() { setBusy(true); try { await api("/api/admin/settings", { method: "PUT", json: s }); toast("Settings saved."); router.refresh(); } catch (e: any) { toast(e.message); } setBusy(false); }
  async function saveRules() {
    setBusy(true);
    try { const lib = await api("/api/admin/library-current"); lib.houseRules = r.split("\n").map(x => x.trim()).filter(Boolean); await api("/api/admin/library", { method: "PUT", json: { library: lib, note: "Writing rules", steps: ["Edited the writing rules"] } }); toast("Saved as a pending change. Apply it in Changes & versions."); router.refresh(); }
    catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  return (<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <section className="card space-y-4 p-5"><h2 className="text-title-md">Claude</h2>
      <p className={`flex items-center gap-2 rounded-lg p-3 text-body-sm ${connected ? "bg-tertiary-fixed/50" : "bg-error-container text-on-error-container"}`}><span className="icon text-[18px]" aria-hidden="true">{connected ? "verified_user" : "error"}</span>{mock ? "Test mode (AI_MOCK=1): scripted answers, no API calls." : connected ? "API key: connected (stored securely on the server)." : "API key: not set. Add ANTHROPIC_API_KEY in your hosting environment."}</p>
      {([["labModel", "Studio Lab"], ["studyModel", "Sample studies"], ["memberModel", "Member AI"]] as const).map(([k, l]) => <label key={k} className="block"><span className="label">{l} model</span><select className="field" value={s[k]} onChange={e => setS({ ...s, [k]: e.target.value })}>{models.map(m => <option key={m}>{m}</option>)}</select></label>)}
      <div className="grid grid-cols-2 gap-3">
        <label><span className="label">Monthly budget (USD)</span><input type="number" min="0" className="field" value={s.monthlyBudgetUsd} onChange={e => setS({ ...s, monthlyBudgetUsd: Number(e.target.value) })} /></label>
        <label><span className="label">Naira per dollar</span><input type="number" min="0" className="field" value={s.ngnPerUsd} onChange={e => setS({ ...s, ngnPerUsd: Number(e.target.value) })} /></label>
      </div>
      <label className="flex items-center gap-2 text-body-md"><input type="checkbox" checked={s.stopAtCap} onChange={e => setS({ ...s, stopAtCap: e.target.checked })} />Stop AI requests when the budget is reached</label>
      <div><span className="label">Prices (USD per million tokens, from Anthropic&apos;s pricing page). Cost shows only once these are filled in.</span>
        <div className="space-y-2">{Array.from(new Set([s.labModel, s.memberModel, s.studyModel])).map(m => <div key={m} className="flex flex-wrap items-center gap-2 text-body-sm"><span className="w-40 font-mono">{m}</span>
          <input type="number" min="0" step="0.01" className="field w-24 py-1" placeholder="Input" aria-label={`${m} input price`} value={s.prices[m]?.in ?? ""} onChange={e => setS({ ...s, prices: { ...s.prices, [m]: { in: Number(e.target.value), out: s.prices[m]?.out || 0 } } })} />
          <input type="number" min="0" step="0.01" className="field w-24 py-1" placeholder="Output" aria-label={`${m} output price`} value={s.prices[m]?.out ?? ""} onChange={e => setS({ ...s, prices: { ...s.prices, [m]: { in: s.prices[m]?.in || 0, out: Number(e.target.value) } } })} /></div>)}</div></div>
      <button className="btn btn-primary" disabled={busy} onClick={save}>Save settings</button>
    </section>
    <div className="space-y-6">
      <section className="card p-5"><h2 className="text-title-md">This month</h2>
        <p className="mt-2 font-serif text-headline-md tabular">${total.toFixed(2)} <span className="font-sans text-body-sm text-on-surface-variant">of ${s.monthlyBudgetUsd} · ₦{Math.round(total * s.ngnPerUsd).toLocaleString("en-NG")}</span></p>
        <div className="mt-2 h-2 overflow-hidden rounded bg-surface-container-high"><div className={`h-full ${pct >= 90 ? "bg-error" : "bg-primary-container"}`} style={{ width: `${pct}%` }} /></div>
        <table className="mt-4 w-full text-body-sm"><thead><tr className="text-left text-label-micro uppercase text-on-surface-variant"><th className="py-1">Feature</th><th>Requests</th><th>Tokens</th><th className="text-right">Cost</th></tr></thead>
          <tbody>{Object.entries(FEATURES).map(([k, l]) => { const u = usage[k] || { requests: 0, tokens: 0, usd: 0 }; return <tr key={k} className="border-t border-outline-variant"><td className="py-1.5">{l}</td><td className="tabular">{u.requests}</td><td className="tabular">{u.tokens.toLocaleString("en-GB")}</td><td className="text-right tabular">${u.usd.toFixed(2)}</td></tr>; })}</tbody></table>
      </section>
      <section className="card p-5"><h2 className="text-title-md">Writing rules</h2><p className="mt-1 text-body-sm text-on-surface-variant">One rule per line, applied to every AI request. Saving creates a pending library change.</p>
        <textarea className="field mt-3 min-h-[160px]" value={r} onChange={e => setR(e.target.value)} aria-label="Writing rules" />
        <button className="btn mt-3" disabled={busy || r === rules.join("\n")} onClick={saveRules}>Save writing rules</button></section>
    </div>
  </div>);
}
