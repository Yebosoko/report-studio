import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";
export const metadata: Metadata = { title: "Terms of service" };
export default function Terms() {
  return (<><PublicHeader /><main className="gutter mx-auto max-w-3xl py-14">
    <h1 className="font-serif text-headline-lg">Terms of service</h1>
    <p className="mt-2 rounded-lg bg-secondary-fixed/50 p-3 text-body-sm">Draft for review: replace this text with terms approved for your business before launch.</p>
    <div className="mt-8 space-y-5 text-body-md leading-7 text-on-surface-variant">
      <p><strong className="text-on-surface">Your content.</strong> You own the reports you create. You are responsible for their accuracy, including any content arranged with AI assistance, and for having the right to use the logos and photos you upload.</p>
      <p><strong className="text-on-surface">Acceptable use.</strong> Don't use the service to break the law, to access other people's accounts, or to disrupt the service.</p>
      <p><strong className="text-on-surface">Plans and limits.</strong> Each plan sets how many reports you can start each month and which templates you can use. Prices are shown on the Pricing page.</p>
      <p><strong className="text-on-surface">Availability.</strong> We work to keep the service available but can't promise it will be uninterrupted. Keep your own copies of important documents.</p>
      <p><strong className="text-on-surface">Ending your account.</strong> You can delete your account at any time. We may suspend accounts that break these terms.</p>
    </div></main><PublicFooter /></>);
}
