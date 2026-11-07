import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";
import { PricingCards } from "./PricingCards";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const FAQ: Array<[string, string]> = [
  ["Will the files open in my version of Word?", "Yes. Reports download as standard .docx files that open in Word 2016 or later, Word for Mac, Word online and Google Docs. Charts stay editable in Word."],
  ["Who can see my reports?", "Only you. Reports, images and brand kits are private to your account and protected by database security rules. Nothing you write is sent to an AI service unless you press an AI button yourself, on a plan that includes it."],
  ["Can I cancel?", "Yes, at any time from your Account page. Your reports stay available to download."],
  ["How do I pay?", "Card or bank transfer in naira. Online payment is being connected; until then, upgrades are arranged directly with the studio."]
];

export default async function Pricing() {
  const plans = (await (await getRepo()).listPlans()).filter(p => p.active);
  return (
    <>
      <PublicHeader />
      <main className="gutter mx-auto max-w-7xl py-14">
        <h1 className="font-serif text-headline-lg">Plans for consultants and firms</h1>
        <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">Every plan exports watermark-free, editable Word files.</p>
        <PricingCards plans={plans} />
        <section className="mt-16 max-w-3xl" aria-labelledby="faq">
          <h2 id="faq" className="font-serif text-headline-md">Questions</h2>
          <div className="mt-6 divide-y divide-outline-variant border-y border-outline-variant">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-sm">{q}<span className="icon text-on-surface-variant transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span></summary><p className="mt-3 text-body-md text-on-surface-variant">{a}</p></details>
            ))}
          </div>
          <p className="mt-8"><Link href="/signup" className="btn btn-primary">Start free</Link></p>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
