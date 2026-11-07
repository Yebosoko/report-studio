import { notFound } from "next/navigation";
import { requireOwnerPage } from "@/lib/auth";
import { PageHead } from "../../PageHead";
import { SampleActions } from "./SampleActions";

export const metadata = { title: "Sample" };
const url = (p: string) => "/api/files/" + p.split("/").map(encodeURIComponent).join("/");
const List = ({ items }: { items?: string[] }) => items?.length ? <ul className="list-disc space-y-1 pl-5">{items.map((x, i) => <li key={i}>{String(x)}</li>)}</ul> : <p className="text-on-surface-variant">—</p>;
export default async function SamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { repo } = await requireOwnerPage();
  const s = await repo.getSample((await params).id); if (!s) notFound();
  const st = s.study;
  return (<>
    <PageHead eyebrow={s.organisation || "Sample"} title={s.name} intro={s.notes || undefined}><SampleActions id={s.id} studied={!!st} palette={st?.palette || []} name={s.name} /></PageHead>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-label="Pages" className="grid grid-cols-2 gap-3 self-start">{s.pages.length ? s.pages.map(p => <figure key={p.path} className="m-0"><img src={url(p.path)} alt={`Page ${p.page}`} className="w-full bg-white shadow-paper" /><figcaption className="mt-1 text-body-sm text-on-surface-variant">Page {p.page}</figcaption></figure>) : <p className="text-body-md text-on-surface-variant">No page images (text-only sample).</p>}</section>
      <section className="card space-y-5 p-5 text-body-md" aria-label="Design study">
        {!st ? <p className="text-on-surface-variant">{s.studyError ? `The last study failed: ${s.studyError}` : "Not studied yet. Choose Study to have Claude describe the design."}</p> : <>
          <p className="font-serif text-title-md">{st.summary}</p>
          <div><p className="micro mb-2">Palette</p><div className="flex flex-wrap gap-3">{(st.palette || []).map((p: any) => <div key={p.hex + p.role} className="w-28"><span className="block h-12 rounded border border-outline-variant" style={{ background: "#" + p.hex }} /><span className="mt-1 block font-mono text-body-sm">#{p.hex}</span><span className="text-body-sm text-on-surface-variant">{p.role}</span></div>)}</div></div>
          {[["Typography", st.typography], ["Cover layout", st.cover], ["Page layout", st.pageLayout]].map(([k, v]) => <div key={k}><p className="micro mb-1">{k}</p><p>{String(v || "—")}</p></div>)}
          <div><p className="micro mb-1">Visual devices</p><List items={st.devices} /></div>
          <div><p className="micro mb-1">Worth reusing</p><List items={st.reuse} /></div>
          <div><p className="micro mb-1">Structure</p><List items={st.structure} /></div>
        </>}
      </section>
    </div>
  </>);
}
