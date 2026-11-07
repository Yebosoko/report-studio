import Link from "next/link";
import { requireOwnerPage } from "@/lib/auth";
import { PageHead } from "../PageHead";
import { UploadSample } from "./UploadSample";

export const metadata = { title: "Samples" };
const url = (p: string) => "/api/files/" + p.split("/").map(encodeURIComponent).join("/");
export default async function Samples() {
  const { repo } = await requireOwnerPage();
  const list = await repo.listSamples();
  return (<>
    <PageHead title="Reports whose design you like" intro="Upload sample reports. Claude studies their design, and the Studio Lab can build original templates inspired by them." />
    <UploadSample />
    {list.length === 0 ? <p className="card mt-6 p-8 text-center text-body-md text-on-surface-variant">No samples yet. Upload a PDF, page images or a Word file above.</p> : (
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map(s => (
        <li key={s.id}><Link href={`/admin/samples/${s.id}`} className="card group flex h-full flex-col p-4 hover:shadow-card">
          <div className="grid aspect-[1/1.3] place-items-center overflow-hidden rounded bg-desk">{s.pages[0] ? <img src={url(s.pages[0].path)} alt="" className="h-full w-full object-cover object-top" /> : <span className="icon text-[40px] text-outline" aria-hidden="true">description</span>}</div>
          <span className="micro mt-3 text-secondary">{s.organisation || "Sample"}</span>
          <span className="font-serif text-title-md group-hover:text-primary">{s.name}</span>
          <span className="mt-auto flex items-center justify-between pt-2 text-body-sm text-on-surface-variant"><span>{s.pageCount ? `${s.pageCount} pages` : s.kind}</span>
            <span className={`badge ${s.study ? "bg-tertiary-fixed text-tertiary" : s.studyError ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"}`}>{s.study ? "Studied" : s.studyError ? "Study failed" : "Not studied"}</span></span>
        </Link></li>))}</ul>)}
  </>);
}
