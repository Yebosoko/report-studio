import type { Metadata } from "next";
import { signOutAction } from "@/lib/auth-actions";
import { Logo } from "@/components/Logo";
export const metadata: Metadata = { title: "Account suspended" };
export default function Suspended() {
  return (<main className="gutter grid min-h-screen place-items-center bg-desk py-10"><div className="card w-full max-w-md p-8">
    <Logo /><h1 className="mt-6 font-serif text-headline-sm">This account is suspended</h1>
    <p className="mt-2 text-body-md text-on-surface-variant">You can't open reports while the account is suspended. Contact the studio to restore access; your reports have not been deleted.</p>
    <form action={signOutAction} className="mt-6"><button className="btn">Sign out</button></form></div></main>);
}
