/* Shared layout for the privacy policy and terms of service. */
import { PublicFooter, PublicHeader } from "./PublicHeader";
import { env } from "@/lib/env";

export const EFFECTIVE = "7 November 2026";
export function Contact() {
  return env.contactEmail ? <>by email at <span className="select-all font-semibold text-on-surface">{env.contactEmail}</span></> : <>through the contact details on this website</>;
}
export function LegalPage({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: Array<[string, React.ReactNode]> }) {
  return (<>
    <PublicHeader />
    <main className="gutter mx-auto max-w-3xl py-14">
      <h1 className="font-serif text-headline-lg">{title}</h1>
      <p className="mt-2 text-body-sm text-on-surface-variant">Effective {EFFECTIVE}</p>
      <div className="mt-6 text-body-lg leading-8 text-on-surface-variant">{intro}</div>
      <nav aria-label="Contents" className="mt-8 rounded-lg border border-outline-variant bg-surface-container-low p-5">
        <p className="micro mb-3">Contents</p>
        <ol className="grid grid-cols-1 gap-x-6 gap-y-1 text-body-sm sm:grid-cols-2">{sections.map(([h], i) => <li key={h}><a className="hover:text-primary hover:underline" href={`#s${i + 1}`}>{i + 1}. {h}</a></li>)}</ol>
      </nav>
      <div className="mt-10 space-y-10">
        {sections.map(([h, body], i) => (
          <section key={h} id={`s${i + 1}`} className="scroll-mt-20" aria-labelledby={`h${i + 1}`}>
            <h2 id={`h${i + 1}`} className="font-serif text-headline-sm text-on-surface">{i + 1}. {h}</h2>
            <div className="legal mt-3 space-y-3 text-body-md leading-7 text-on-surface-variant">{body}</div>
          </section>
        ))}
      </div>
    </main>
    <PublicFooter />
  </>);
}
