import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";
export const metadata: Metadata = { title: "Privacy policy" };
export default function Privacy() {
  return (<><PublicHeader /><main className="gutter mx-auto max-w-3xl py-14">
    <h1 className="font-serif text-headline-lg">Privacy policy</h1>
    <p className="mt-2 rounded-lg bg-secondary-fixed/50 p-3 text-body-sm">Draft for review: replace this text with a policy approved for your business before launch. It is written with Nigeria's Data Protection Act 2023 in mind.</p>
    <div className="mt-8 space-y-5 text-body-md leading-7 text-on-surface-variant">
      <p><strong className="text-on-surface">What we collect.</strong> Your name, email address, organisation and role; the reports, drafts, images and brand details you add; and basic usage records (for example, when a Word file is exported).</p>
      <p><strong className="text-on-surface">Why.</strong> To provide the service you sign up for, keep your account secure, and understand how the product is used so it can be improved.</p>
      <p><strong className="text-on-surface">Who can see your reports.</strong> Only you. Reports, images and brand kits are private to your account. The studio owner cannot open them without your consent, and any such support access is logged.</p>
      <p><strong className="text-on-surface">AI processing.</strong> Report text is sent to Anthropic's Claude service only when you press an AI button on a plan that includes AI. It is not used to train models under Anthropic's commercial terms.</p>
      <p><strong className="text-on-surface">Where data is stored.</strong> With our hosting and database providers (Vercel and Supabase), in private, access-controlled storage.</p>
      <p><strong className="text-on-surface">Your rights.</strong> You can download all your data and delete your account at any time from the Account page. To ask about your data, contact the studio.</p>
    </div></main><PublicFooter /></>);
}
