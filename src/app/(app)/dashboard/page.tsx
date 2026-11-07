import type { Metadata } from "next";
import Link from "next/link";
import { pendingCount, requireUser } from "@/lib/auth";
import { planUsage } from "@/lib/reports";
import { AppHeader } from "@/components/AppHeader";
import { ReportThumb } from "@/components/Thumb";
import { NewReportButton, ReportActions } from "./DashboardClient";

export const metadata: Metadata = { title: "Your reports" };
export const dynamic = "force-dynamic";

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const s = await requireUser("/dashboard");
  const sp = await searchParams;
  const [reports, pub, usage, pending] = await Promise.all([s.repo.listReports(s.profile.id), s.repo.getPublished(), planUsage(s.repo, s.profile), pendingCount(s)]);
  const library = pub.library;
  return (
    <>
      <AppHeader profile={s.profile} active="reports" pending={pending} />
      <main className="gutter mx-auto max-w-7xl py-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}>
        {sp.password === "updated" && <p role="status" className="mb-6 rounded-lg bg-tertiary-fixed/60 px-4 py-2 text-body-sm">Your password has been changed.</p>}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="micro">Your reports</p><h1 className="mt-1 font-serif text-headline-lg">Reports in progress</h1></div>
          <div className="flex flex-wrap gap-2"><NewReportButton example label="Open the example" /><Link href="/library?pick=1" className="btn btn-primary"><span className="icon text-[18px]" aria-hidden="true">add</span>New report</Link></div>
        </div>
        <div className="card mt-6 flex flex-wrap items-center gap-4 p-4">
          <span className="text-label-md">{usage.plan?.name || "Plan"} plan</span>
          <div className="min-w-[160px] flex-1">
            <div className="h-1.5 overflow-hidden rounded bg-surface-container-high"><div className={`h-full ${usage.canCreate ? "bg-primary-container" : "bg-error"}`} style={{ width: usage.limit ? `${Math.min(100, (usage.used / usage.limit) * 100)}%` : "6%" }} /></div>
          </div>
          <span className="text-body-sm text-on-surface-variant tabular">{usage.used} of {usage.limit ?? "unlimited"} reports this month</span>
          {!usage.canCreate && <Link href="/account#billing" className="btn btn-sm">Upgrade</Link>}
        </div>
        {reports.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center px-6 py-16 text-center">
            <span className="icon text-[40px] text-outline" aria-hidden="true">description</span>
            <h2 className="mt-3 font-serif text-headline-sm">No reports yet</h2>
            <p className="mt-2 max-w-md text-body-md text-on-surface-variant">Choose a template to start your first report, or open the example to see what a finished one looks like.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2"><Link href="/library?pick=1" className="btn btn-primary">Browse the library</Link><NewReportButton example label="Open the example" /></div>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map(r => (
              <li key={r.id} className="card flex gap-4 p-4">
                <Link href={`/reports/${r.id}`} className="w-[84px] shrink-0" aria-hidden="true" tabIndex={-1}><ReportThumb library={library} report={r} className="shadow-paper" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/reports/${r.id}`} className="font-serif text-title-md leading-snug hover:text-primary">{r.title || "Untitled report"}</Link>
                  <p className="mt-1 truncate text-body-sm text-on-surface-variant">{r.docType}</p>
                  {r.client && <p className="truncate text-body-sm text-on-surface-variant">{r.client}</p>}
                  <p className="mt-1 text-body-sm text-outline">Edited {ago(r.updatedAt)}</p>
                  <ReportActions id={r.id} title={r.title || "Untitled report"} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
