"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client/useApi";
import { confirmBox, toast } from "@/editor/ui.js";

export function SampleActions({ id, studied, palette, name }: { id: string; studied: boolean; palette: Array<{ hex: string; role: string }>; name: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  const themeAsk = `Make a colour theme from sample "${name}"${palette.length ? ` (palette: ${palette.map(p => "#" + p.hex + " " + p.role).join(", ")})` : ""}.`;
  return (<>
    <Link href={`/admin/lab?sample=${id}`} className="btn btn-primary">Make a template like this</Link>
    <Link href={`/admin/lab?sample=${id}&ask=${encodeURIComponent(themeAsk)}`} className="btn">Make a theme from it</Link>
    <button className="btn" disabled={busy} onClick={async () => { setBusy(true); toast("Claude is studying the design… about a minute.", 4000); try { await api(`/api/admin/samples/${id}`, { json: { action: "study" } }); router.refresh(); } catch (e: any) { toast(e.message, 7000); } setBusy(false); }}>{busy ? "Studying…" : studied ? "Study again" : "Study"}</button>
    <button className="btn btn-danger" disabled={busy} onClick={async () => { if (!(await confirmBox("Delete this sample?", "Its pages and study are removed.", "Delete", "Cancel", true))) return; await api(`/api/admin/samples/${id}`, { method: "DELETE" }); router.push("/admin/samples"); router.refresh(); }}>Delete sample</button>
  </>);
}
