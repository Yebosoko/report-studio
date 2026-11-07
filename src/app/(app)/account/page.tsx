import type { Metadata } from "next";
import { pendingCount, requireUser } from "@/lib/auth";
import { planUsage } from "@/lib/reports";
import { AppHeader } from "@/components/AppHeader";
import { AccountForms } from "./AccountForms";
export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const s = await requireUser("/account");
  const [usage, plans, pending] = await Promise.all([planUsage(s.repo, s.profile), s.repo.listPlans(), pendingCount(s)]);
  return (<>
    <AppHeader profile={s.profile} active={null} pending={pending} />
    <main className="gutter mx-auto max-w-4xl py-8">
      <p className="micro">Account</p><h1 className="mt-1 font-serif text-headline-lg">Account and billing</h1>
      <AccountForms profile={s.profile} usage={{ used: usage.used, limit: usage.limit }} plan={usage.plan} plans={plans.filter(p => p.active)} />
    </main>
  </>);
}
