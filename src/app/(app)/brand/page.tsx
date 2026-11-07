import type { Metadata } from "next";
import { pendingCount, requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { BrandForm } from "./BrandForm";
export const metadata: Metadata = { title: "Brand" };
export const dynamic = "force-dynamic";
export default async function BrandPage() {
  const s = await requireUser("/brand");
  const [brand, pub, pending] = await Promise.all([s.repo.getBrand(s.profile.id), s.repo.getPublished(), pendingCount(s)]);
  return (<>
    <AppHeader profile={s.profile} active="brand" pending={pending} />
    <main className="gutter mx-auto max-w-6xl py-8">
      <p className="micro">Brand</p><h1 className="mt-1 font-serif text-headline-lg">Your brand</h1>
      <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Your firm name, logo and preferred design are applied to every new report. You can still change them per report in the editor.</p>
      <BrandForm brand={brand} library={pub.library} />
    </main>
  </>);
}
