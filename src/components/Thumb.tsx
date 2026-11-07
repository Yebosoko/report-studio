/* Server-rendered miniature covers, drawn by the same renderer as the editor and Word export. */
import { makeLib } from "@/engine/library.js";
import RD from "@/engine/render.js";
import type { Library, ReportSummary } from "@/lib/types";

export function TemplateThumb({ library, templateId, over, className }: { library: Library; templateId: string; over?: any; className?: string }) {
  const L = makeLib(library);
  return <div className={className} dangerouslySetInnerHTML={{ __html: RD.thumb(L, L.tpl(templateId), over) }} />;
}
export function ReportThumb({ library, report, className }: { library: Library; report: ReportSummary; className?: string }) {
  const L = makeLib(library);
  return <div className={className} dangerouslySetInnerHTML={{ __html: RD.reportThumb(L, report) }} />;
}
