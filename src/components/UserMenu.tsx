"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/auth-actions";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", off); document.removeEventListener("keydown", esc); };
  }, []);
  const initials = (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]!.toUpperCase()).join("");
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-1 rounded p-1 hover:bg-surface-container-high">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-label-md text-on-primary">{initials || "?"}</span>
        <span className="hidden max-w-[160px] truncate text-label-md lg:inline">{name || email}</span>
        <span className="icon text-[18px] text-on-surface-variant" aria-hidden="true">arrow_drop_down</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-card">
          <div className="px-4 py-2"><p className="micro">Signed in as</p><p className="truncate text-label-md">{email}</p></div>
          <div className="my-1 h-px bg-outline-variant" />
          <Link role="menuitem" href="/account" className="flex items-center gap-2 px-4 py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface"><span className="icon text-[16px]" aria-hidden="true">manage_accounts</span>Account</Link>
          <Link role="menuitem" href="/account#billing" className="flex items-center gap-2 px-4 py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface"><span className="icon text-[16px]" aria-hidden="true">credit_card</span>Billing</Link>
          <div className="my-1 h-px bg-outline-variant" />
          <form action={signOutAction}><button role="menuitem" className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-label-md text-error hover:bg-error-container hover:text-on-error-container"><span className="icon text-[16px]" aria-hidden="true">logout</span>Sign out</button></form>
        </div>
      )}
    </div>
  );
}
