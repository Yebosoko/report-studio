/* Top bar for signed-in screens. Members see Reports · Library · Brand; the owner also sees Admin with a pending-changes badge. */
import Link from "next/link";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import type { Profile } from "@/lib/types";

export type Tab = "reports" | "library" | "brand" | "admin" | null;
export function AppHeader({ profile, active, pending = 0, children }: { profile: Profile; active: Tab; pending?: number; children?: React.ReactNode }) {
  const tabs: Array<[Tab, string, string]> = [["reports", "Reports", "/dashboard"], ["library", "Library", "/library"], ["brand", "Brand", "/brand"]];
  const owner = profile.role === "owner";
  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-6">
          <Logo href="/dashboard" />
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto" aria-label="Main">
            {tabs.map(([k, label, href]) => (
              <Link key={k} href={href} aria-current={active === k ? "page" : undefined}
                className={`whitespace-nowrap rounded px-2 py-1 text-label-md ${active === k ? "bg-surface-container font-semibold text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>{label}</Link>
            ))}
            {owner && (
              <Link href="/admin" aria-current={active === "admin" ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-label-md ${active === "admin" ? "bg-surface-container font-semibold text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                Admin{pending > 0 && <span className="rounded-full bg-secondary px-1.5 text-[11px] font-bold leading-4 text-white" aria-label={`${pending} pending`}>{pending}</span>}
              </Link>
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {children}
          <UserMenu name={profile.name} email={profile.email} />
        </div>
      </div>
    </header>
  );
}
