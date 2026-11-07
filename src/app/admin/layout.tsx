/* Owner-only area. requireOwnerPage() answers 404 to everyone else, so the area's existence isn't revealed. */
import { pendingCount, requireOwnerPage } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · Report Studio" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireOwnerPage();
  const [pending, samples] = await Promise.all([pendingCount(s), s.repo.listSamples()]);
  return (
    <>
      <AppHeader profile={s.profile} active="admin" pending={pending} />
      <div className="border-b border-secondary/30 bg-secondary-fixed/60"><div className="gutter mx-auto flex max-w-[1600px] items-center gap-2 py-1.5 text-label-md text-on-secondary-container"><span className="icon text-[16px]" aria-hidden="true">lock</span>Owner view — members can&apos;t see this area</div></div>
      <div className="mx-auto grid grid-cols-1 max-w-[1600px] lg:grid-cols-[232px_minmax(0,1fr)]">
        <AdminNav pending={pending} unstudied={samples.filter(x => !x.study).length} />
        <main className="gutter min-w-0 py-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}>{children}</main>
      </div>
    </>
  );
}
