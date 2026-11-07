"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client/useApi";
import { confirmBox, toast } from "@/editor/ui.js";

export function NewReportButton({ example, templateId, label, primary }: { example?: boolean; templateId?: string; label: string; primary?: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return <button type="button" className={`btn ${primary ? "btn-primary" : ""}`} disabled={busy} onClick={async () => {
    setBusy(true);
    try { const { id } = await api("/api/reports", { json: example ? { example: true } : { templateId } }); router.push(`/reports/${id}`); }
    catch (e: any) { toast(e.message); setBusy(false); }
  }}>{busy ? "Opening…" : label}</button>;
}

export function ReportActions({ id, title }: { id: string; title: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return (
    <div className="mt-auto flex flex-wrap gap-1 pt-3">
      <Link href={`/reports/${id}`} className="btn btn-sm">Open</Link>
      <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={async () => { setBusy(true); try { await api(`/api/reports/${id}/duplicate`, { method: "POST" }); toast("Duplicated."); router.refresh(); } catch (e: any) { toast(e.message); } setBusy(false); }}>Duplicate</button>
      <button type="button" className="btn btn-sm btn-ghost btn-danger" disabled={busy} onClick={async () => {
        if (!(await confirmBox("Delete this report?", `“${title}” will be deleted for good.`, "Delete report", "Cancel", true))) return;
        setBusy(true); try { await api(`/api/reports/${id}`, { method: "DELETE" }); toast("Report deleted."); router.refresh(); } catch (e: any) { toast(e.message); } setBusy(false);
      }}>Delete</button>
    </div>
  );
}
