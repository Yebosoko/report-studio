/* Landing page. Report artwork is drawn by the real renderer from the published library, so it always matches the product. */
import Link from "next/link";
import { makeLib } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { getRepo } from "@/lib/repo";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";
import { TemplateThumb } from "@/components/Thumb";

export const dynamic = "force-dynamic";

function HeroPages({ library }: { library: any }) {
  const L = makeLib(library);
  const th = L.theme("laterite"), f = L.font("classic");
  const cover = RD.cover({ def: L.cover("banner"), theme: th, font: f, abbr: "ESIA",
    meta: { title: "Lekki Coastal Road ESIA", subtitle: "Environmental and Social Impact Assessment for the proposed dual-carriage coastal corridor, Phase II", docType: "Environmental and Social Impact Assessment", client: "Lagos State Ministry of Environment", preparedBy: "Coastal Safeguards Ltd", date: "October 2026", version: "Draft for disclosure" } });
  const vars = RD.varStyle(th, f);
  const rows = [["Dust and air quality", "High", "Low"], ["Loss of fishing access", "High", "Moderate"], ["Mangrove clearance", "Moderate", "Low"], ["Traffic safety", "Moderate", "Low"]];
  const rc = (v: string) => ({ High: "C0392B", Moderate: "E0A030", Low: "3E8E5A" } as any)[v];
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[640px] sm:h-[520px]" aria-label="Two sample report pages: a designed cover and an inside page with key figures, a chart and a colour-coded table">
      <div className="sheet absolute left-0 top-6 w-[54%] -rotate-3" style={{ maxWidth: 330 }} dangerouslySetInnerHTML={{ __html: `<div style="${vars}">${cover}</div>` }} />
      <div className="sheet doc absolute right-0 top-0 w-[54%] rotate-2 overflow-hidden" style={{ maxWidth: 330, aspectRatio: "1/1.414", ...Object.fromEntries(vars.split(";").map(p => [p.slice(0, p.indexOf(":")), p.slice(p.indexOf(":") + 1)])) } as any} data-chapter="band">
        <div style={{ padding: "8% 8%", fontSize: 7.5, lineHeight: 1.45 }}>
          <div style={{ background: "var(--r-primary)", padding: "8px 10px", marginBottom: 10 }}>
            <div style={{ color: "var(--r-accent)", fontFamily: "var(--r-head)", fontWeight: 700, fontSize: 11 }}>08</div>
            <div style={{ color: "#fff", fontFamily: "var(--r-head)", fontSize: 13, lineHeight: 1.15 }}>Impact Assessment</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 10 }}>
            {[["1,240", "project-affected persons"], ["18.4 km", "corridor length"], ["₦2.1bn", "ESMP budget"]].map(([v, l]) => (
              <div key={l} style={{ background: "var(--r-tint)", borderTop: "2px solid var(--r-primary)", padding: "5px 6px" }}>
                <div style={{ fontFamily: "var(--r-head)", fontWeight: 700, color: "var(--r-primary)", fontSize: 12 }}>{v}</div><div style={{ color: "#555" }}>{l}</div>
              </div>))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 62, height: 62, borderRadius: "50%", background: `conic-gradient(#${th.primary} 0 48%, #${th.secondary} 48% 77%, #${th.accent} 77% 100%)`, WebkitMask: "radial-gradient(circle, transparent 42%, #000 43%)", mask: "radial-gradient(circle, transparent 42%, #000 43%)", flex: "none" }} />
            <div><div style={{ fontWeight: 700, color: "var(--r-primary)" }}>Figure 8.1 Grievances by category</div><div style={{ color: "#555" }}>Land and compensation 48% · Construction nuisance 29% · Other 23%</div></div>
          </div>
          <div style={{ fontWeight: 700, color: "var(--r-primary)", marginBottom: 3 }}><span style={{ color: "var(--r-accent)" }}>Table 8.1</span> Significance before and after mitigation</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Impact", "Before", "After"].map(h => <th key={h} style={{ background: "var(--r-primary)", color: "#fff", textAlign: "left", padding: "3px 4px" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(r => <tr key={r[0]}><td style={{ padding: "3px 4px", borderBottom: "1px solid #ddd" }}>{r[0]}</td>{[r[1], r[2]].map((v, i) => <td key={i} style={{ padding: "3px 4px", background: "#" + rc(v), color: "#fff", fontWeight: 700 }}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default async function Landing() {
  const repo = await getRepo();
  const pub = await repo.getPublished(); const library = pub.library;
  const plans = (await repo.listPlans()).filter(p => p.active);
  const L = makeLib(library);
  const gallery = ["esia", "esmp", "rap", "sep", "monitor", "concept"].filter(id => library.templates.some((t: any) => t.id === id));
  return (
    <>
      <PublicHeader />
      <main>
        <section className="gutter mx-auto grid grid-cols-1 max-w-7xl items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="micro mb-4 text-secondary">Safeguards reports · Word export</p>
            <h1 className="font-serif text-[2.25rem] leading-[1.1] tracking-tight sm:text-headline-xl" style={{ textWrap: "balance" } as any}>Turn draft reports into donor-grade documents in minutes</h1>
            <p className="mt-5 max-w-xl text-body-lg text-on-surface-variant">ESIA, ESMP, RAP and monitoring reports designed like World Bank and UN publications, with colour-coded compliance tables and real charts, exported to Word you can keep editing.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="btn btn-primary">Start free</Link><Link href="#templates" className="btn">See templates</Link></div>
          </div>
          <div className="rounded-xl bg-desk p-6 sm:p-10"><HeroPages library={library} /></div>
        </section>

        <section className="gutter mx-auto max-w-7xl py-12" aria-labelledby="how">
          <h2 id="how" className="font-serif text-headline-md">How it works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[["Choose a template", "Twelve formats for safeguards, monitoring, proposals and corporate documents, each with its own sections, colours and cover."],
              ["Paste your draft", "Bring in field notes, tables and text from Word or PDF. Edit on the page, or let AI sort it into sections where your plan includes it."],
              ["Download Word", "An A4 .docx with your cover, contents, captions, editable charts and colour-coded tables, ready for client comments."]].map(([t, d], i) => (
              <li key={t} className="card p-6"><span className="font-serif text-headline-md text-secondary">{String(i + 1).padStart(2, "0")}</span><h3 className="mt-2 text-title-md">{t}</h3><p className="mt-2 text-body-md text-on-surface-variant">{d}</p></li>
            ))}
          </ol>
        </section>

        <section id="templates" className="gutter mx-auto max-w-7xl scroll-mt-20 py-12" aria-labelledby="tpl">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="tpl" className="font-serif text-headline-md">Templates</h2><p className="mt-1 text-body-md text-on-surface-variant">{library.templates.length} formats · {library.themes.length} colour themes · {library.covers.length} cover designs</p></div><Link href="/signup" className="btn btn-sm">Try them free</Link></div>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {gallery.map(id => { const t = L.tpl(id); return (
              <figure key={id} className="m-0"><TemplateThumb library={library} templateId={id} className="shadow-paper" /><figcaption className="mt-2"><span className="micro block text-secondary">{t.abbr}</span><span className="text-body-sm font-semibold">{t.name}</span></figcaption></figure>
            ); })}
          </div>
        </section>

        <section className="gutter mx-auto max-w-7xl py-12" aria-labelledby="built">
          <h2 id="built" className="font-serif text-headline-md">Built for safeguards work</h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[["fact_check", "Sector templates", "Section structures aligned with the World Bank ESF and IFC Performance Standards, with prompts for what each section needs."],
              ["table_chart", "Colour-coded compliance tables", "Red, amber and green cells for significance, compliance and grievance status, with the words kept visible for print."],
              ["bar_chart", "Real Word charts", "Column, bar, line, pie and doughnut charts that stay editable in Word, so a reviewer's correction takes seconds."],
              ["verified", "Your brand on every report", "Your logo, firm name and default colours carried onto every cover and header."]].map(([i, t, d]) => (
              <div key={t} className="card p-6"><span className="icon text-primary" aria-hidden="true">{i}</span><h3 className="mt-3 text-title-sm">{t}</h3><p className="mt-2 text-body-sm text-on-surface-variant">{d}</p></div>
            ))}
          </div>
        </section>

        <section className="gutter mx-auto max-w-7xl py-12" aria-labelledby="ba">
          <h2 id="ba" className="font-serif text-headline-md">From draft to designed page</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="card p-6"><p className="micro mb-4">Your draft</p>
              <div className="space-y-2 font-mono text-[12px] leading-relaxed text-on-surface-variant">
                <p>3.2 Grievances. 41 grievances logged Jul–Sep. Land/compensation 20, construction nuisance 12, other 9. 33 closed, 8 open, 2 overdue past 30 days.</p>
                <p>Dust at Ajah junction exceeded limits on 4 days. Watering increased to 3x daily from 12 Aug.</p>
                <p>ESS5: 1,240 PAPs. 1,102 compensated (88.9%).</p>
              </div></div>
            <div className="card p-6"><p className="micro mb-4">In Report Studio</p>
              <div className="grid grid-cols-3 gap-2">{[["41", "grievances logged"], ["33", "closed"], ["88.9%", "PAPs compensated"]].map(([v, l]) => <div key={l} className="border-t-4 border-primary bg-surface-container-low p-3"><div className="font-serif text-headline-sm text-primary">{v}</div><div className="text-body-sm text-on-surface-variant">{l}</div></div>)}</div>
              <table className="mt-4 w-full text-body-sm"><thead><tr className="bg-primary text-on-primary"><th className="px-2 py-1 text-left">Category</th><th className="px-2 py-1 text-left">Status</th></tr></thead>
                <tbody>{[["Land and compensation", "Open", "E0A030"], ["Construction nuisance", "Closed", "3E8E5A"], ["Payment delays", "Overdue", "C0392B"]].map(([a, b, c]) => <tr key={a} className="border-b border-outline-variant"><td className="px-2 py-1">{a}</td><td className="px-2 py-1 font-bold text-white" style={{ background: "#" + c }}>{b}</td></tr>)}</tbody></table>
            </div>
          </div>
        </section>

        <section className="border-y border-outline-variant bg-surface-container-low" aria-label="Standards covered">
          <div className="gutter mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 py-6 text-label-md text-on-surface-variant">
            <span className="micro">Standards covered</span><span>World Bank ESS1–ESS10</span><span>IFC Performance Standards PS1–PS8</span><span>AfDB Integrated Safeguards System</span>
          </div>
        </section>

        {plans.length > 0 && (
          <section className="gutter mx-auto max-w-7xl py-12" aria-labelledby="pt">
            <div className="flex flex-wrap items-end justify-between gap-4"><h2 id="pt" className="font-serif text-headline-md">Plans</h2><Link href="/pricing" className="btn btn-sm">Compare plans</Link></div>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {plans.map(p => (
                <div key={p.id} className="card p-6"><h3 className="text-title-md">{p.name}</h3><p className="mt-2 font-serif text-headline-md">{p.priceNgn ? `₦${p.priceNgn.toLocaleString("en-NG")}` : "Free"}<span className="text-body-sm font-sans text-on-surface-variant">{p.priceNgn ? " / month" : ""}</span></p><p className="mt-2 text-body-sm text-on-surface-variant">{p.description}</p></div>
              ))}
            </div>
          </section>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
