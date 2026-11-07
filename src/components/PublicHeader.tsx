import Link from "next/link";
import { Logo } from "./Logo";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";

export async function PublicHeader() {
  const s = await getSession().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto flex h-14 max-w-7xl items-center justify-between gap-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Main">
          <Link href="/#templates" className="hidden rounded px-2 py-1 text-label-md text-on-surface-variant hover:text-on-surface sm:inline">Templates</Link>
          <Link href="/pricing" className="rounded px-2 py-1 text-label-md text-on-surface-variant hover:text-on-surface">Pricing</Link>
          {s ? <Link href="/dashboard" className="btn btn-primary btn-sm">Open workspace</Link> : (<>
            <Link href="/signin" className="rounded px-2 py-1 text-label-md text-on-surface-variant hover:text-on-surface">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
          </>)}
        </nav>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-outline-variant bg-surface-container-low">
      <div className="gutter mx-auto grid max-w-7xl gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="font-serif text-title-md">Report Studio</p><p className="mt-2 text-body-sm text-on-surface-variant">Designed, editable Word reports for environmental and social safeguards work.</p></div>
        <div><p className="micro mb-3">Product</p><ul className="space-y-2 text-body-sm"><li><Link href="/#templates" className="hover:text-primary">Templates</Link></li><li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li><li><Link href="/signup" className="hover:text-primary">Create an account</Link></li></ul></div>
        <div><p className="micro mb-3">Legal</p><ul className="space-y-2 text-body-sm"><li><Link href="/privacy" className="hover:text-primary">Privacy policy</Link></li><li><Link href="/terms" className="hover:text-primary">Terms of service</Link></li></ul></div>
        <div><p className="micro mb-3">Contact</p><p className="text-body-sm text-on-surface-variant">Questions about plans or your data? {env.contactEmail ? <>Email <span className="select-all font-semibold text-on-surface">{env.contactEmail}</span>.</> : "Write to the Report Studio team."}</p></div>
      </div>
      <div className="gutter mx-auto max-w-7xl pb-8 text-body-sm text-on-surface-variant" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}>© {new Date().getFullYear()} Report Studio</div>
    </footer>
  );
}
