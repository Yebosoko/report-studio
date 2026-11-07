import Link from "next/link";
import { requireOwnerPage } from "@/lib/auth";
import { monthStartISO } from "@/lib/reports";
import { PageHead } from "./PageHead";

export const metadata = { title: "Overview" };
const ago = (iso: string) => { const s = (Date.now() - new Date(iso).getTime()) / 1000; return s < 3600 ? `${Math.max(1, Math.floor(s / 60))} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const ACTIONS: Record<string, string> = { "lab.request": "asked the Studio Lab", "lab.tool": "Studio Lab tool", "library.apply": "published a library version", "library.discard": "discarded the pending change", "library.rollback": "rolled back the library", "library.builder_save": "saved a builder change", "sample.upload": "uploaded a sample", "sample.study": "studied a sample", "sample.delete": "deleted a sample", "user.update": "changed a member", "plan.update": "edited a plan", "settings.update": "changed AI settings", "account.delete": "deleted their account" };

export default async function Overview() {
  const { repo } = await requireOwnerPage();
  const since = monthStartISO();
  const [profiles, reportsMonth, exportsMonth, usage, settings, pub, weekly, cs, samples, audit] = await Promise.all([
    repo.listProfiles(), repo.countAllReportsSince(since), repo.countEventsSince("word_export", since), repo.usageSince(since), repo.getSettings(), repo.getPublished(), repo.eventsByWeek("word_export", 8), repo.getPendingChangeSet(), repo.listSamples(), repo.listAudit(12)]);
  const active = profiles.filter(p => p.status === "active").length;
  const usd = usage.reduce((a, r) => a + r.costUsd, 0); const priced = Object.keys(settings.prices || {}).length > 0;
  const lib = pub.library; const max = Math.max(1, ...weekly.map(w => w.count));
  const unstudied = samples.filter(s => !s.study);
  const W = 560, H = 160, pts = weekly.map((w, i) => [20 + (i * (W - 40)) / Math.max(1, weekly.length - 1), H - 20 - (w.count / max) * (H - 40)]);
  return (<>
    <PageHead title="Admin overview" intro="How the studio is being used this month, and what needs your attention." />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {[["Active members", String(active), `${profiles.length} registered`], ["Reports created", String(reportsMonth), "this month"], ["Word exports", String(exportsMonth), "this month"],
        ["AI requests and cost", `${usage.length} req`, priced ? `$${usd.toFixed(2)} · ₦${Math.round(usd * settings.ngnPerUsd).toLocaleString("en-NG")}${settings.monthlyBudgetUsd ? ` of $${settings.monthlyBudgetUsd} cap` : ""}` : "Add token prices in AI settings to see cost"],
        ["Library size", `${lib.templates.length} templates`, `${lib.themes.length} themes · ${lib.covers.length} covers · v${pub.versionNo}`]].map(([l, v, d]) => (
        <div key={l} className="card p-4"><p className="micro">{l}</p><p className="mt-3 font-serif text-headline-md tabular">{v}</p><p className="mt-1 text-body-sm text-on-surface-variant">{d}</p></div>))}
    </div>
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card p-5" aria-labelledby="wk"><h2 id="wk" className="font-serif text-headline-sm">Weekly Word exports</h2><p className="text-body-sm text-on-surface-variant">Last {weekly.length} weeks</p>
        <div className="mt-4 overflow-x-auto"><svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full min-w-[420px]" role="img" aria-label={`Weekly exports: ${weekly.map(w => w.count).join(", ")}`}>
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1="20" x2={W - 20} y1={20 + f * (H - 40)} y2={20 + f * (H - 40)} stroke="rgb(var(--c-outline-variant))" strokeDasharray="3 4" />)}
          <polyline fill="none" stroke="rgb(var(--c-primary))" strokeWidth="2.5" points={pts.map(p => p.join(",")).join(" ")} />
          {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="4" fill="rgb(var(--c-primary))" /><text x={p[0]} y={p[1] - 9} textAnchor="middle" fontSize="11" fill="rgb(var(--c-on-surface))">{weekly[i].count}</text><text x={p[0]} y={H + 12} textAnchor="middle" fontSize="10" fill="rgb(var(--c-on-surface-variant))">{weekly[i].week.slice(5)}</text></g>)}
        </svg></div></section>
      <section className="card p-5" aria-labelledby="att"><h2 id="att" className="font-serif text-headline-sm">Needs your attention</h2>
        <ul className="mt-4 space-y-3">
          {cs && <li className="rounded-lg bg-secondary-fixed/50 p-3"><p className="text-title-sm">A pending Studio Lab change</p><p className="text-body-sm text-on-surface-variant">{cs.summary}</p><Link href="/admin/changes" className="btn btn-sm mt-2">Review changes</Link></li>}
          {unstudied.length > 0 && <li className="rounded-lg bg-surface-container-low p-3"><p className="text-title-sm">{unstudied.length} sample{unstudied.length > 1 ? "s" : ""} not yet studied</p><Link href="/admin/samples" className="btn btn-sm mt-2">Open samples</Link></li>}
          {priced && settings.monthlyBudgetUsd > 0 && usd >= settings.monthlyBudgetUsd * 0.8 && <li className="rounded-lg bg-error-container p-3 text-on-error-container"><p className="text-title-sm">AI spend is at {Math.round((usd / settings.monthlyBudgetUsd) * 100)}% of the monthly cap</p><Link href="/admin/ai" className="btn btn-sm mt-2">AI settings</Link></li>}
          {!cs && !unstudied.length && <li className="text-body-md text-on-surface-variant">Nothing waiting. Payments will appear here once they're connected.</li>}
        </ul></section>
    </div>
    <section className="card mt-6 p-5" aria-labelledby="act"><h2 id="act" className="font-serif text-headline-sm">Recent activity</h2>
      {audit.length ? <ul className="mt-3 divide-y divide-outline-variant">{audit.map(a => {
        const who = profiles.find(p => p.id === a.actor);
        return <li key={String(a.id)} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-body-sm"><span><strong>{who?.name || who?.email || "System"}</strong> {ACTIONS[a.action] || a.action}{a.action === "lab.tool" && a.target ? `: ${a.target}` : ""}</span><span className="text-on-surface-variant">{ago(a.createdAt)}</span></li>;
      })}</ul> : <p className="mt-2 text-body-md text-on-surface-variant">No activity yet.</p>}
    </section>
  </>);
}
