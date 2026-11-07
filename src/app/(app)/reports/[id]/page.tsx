import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isOwner, pendingCount, requireUser } from "@/lib/auth";
import { allowedTemplateIds, planUsage, reconcile } from "@/lib/reports";
import { AppHeader } from "@/components/AppHeader";
import { EditorProvider, EditorMount, EditorToolbar } from "./EditorClient";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lib?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const s = await requireUser(`/reports/${id}`);
  const row = await s.repo.getReport(s.profile.id, id);
  if (!row) notFound();
  const owner = isOwner(s.profile);
  const draft = owner && sp.lib === "draft" ? await s.repo.getDraft() : null;
  const library = (draft || await s.repo.getPublished()).library;
  const { body, notices } = reconcile(library, row.body);
  const [usage, pending] = await Promise.all([planUsage(s.repo, s.profile), pendingCount(s)]);
  return (
    <EditorProvider id={id} library={library} report={body} draft={row.draftText || ""} aiEnabled={usage.aiEnabled} notices={notices} previewingDraft={!!draft}>
      <AppHeader profile={s.profile} active="reports" pending={pending}><EditorToolbar /></AppHeader>
      <EditorMount />
    </EditorProvider>
  );
}
