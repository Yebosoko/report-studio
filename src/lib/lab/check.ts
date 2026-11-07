/* Library checks run on the server: validation rules, every cover renders, every template builds a Word file. */
import "server-only";
import { makeLib, validateLibrary, util } from "@/engine/library.js";
import RD from "@/engine/render.js";
import { buildDocx } from "@/engine/docx.js";
import example from "@/engine/seed/example.json";
import type { Library } from "../types";

export interface CheckResult { errors: string[]; warnings: string[]; passed: string[]; at: string }

export async function checkLibrary(lib: Library): Promise<CheckResult> {
  const errors: string[] = [], warnings: string[] = [], passed: string[] = [];
  const v = validateLibrary(lib);
  errors.push(...v.errors); warnings.push(...v.warnings);
  if (!v.errors.length) passed.push("Library is valid.");
  if (!errors.length) {
    const docx = await import("docx"); const DC = await import("docx/charts");
    const L = makeLib(lib); let ok = 0;
    for (const t of lib.templates) {
      try {
        const R: any = util.clone(example);
        Object.assign(R, { templateId: t.id, theme: t.theme, cover: t.cover, font: t.font, style: L.styleOf(t) }); R.meta.abbr = t.abbr; R.meta.docType = t.docType;
        R.sections = t.sections.map((s: any, i: number) => ({ title: s.title, hint: s.hint || "", blocks: (example as any).sections[i % (example as any).sections.length].blocks }));
        const buf = await docx.Packer.toBuffer(buildDocx(L, R, { images: {}, coverSlots: {}, logo: null }, docx, DC));
        if (buf.length < 5000) throw new Error("the Word file came out empty");
        if (!/class="cover"/.test(RD.thumb(L, t))) throw new Error("the cover preview didn't render");
        ok++;
      } catch (e: any) { errors.push(`Test export of template "${t.id}" failed: ${e.message || e}`); }
    }
    for (const c of lib.covers) { try { RD.cover({ def: c, theme: L.theme(lib.themes[0].id), font: L.font(lib.fonts[0].id), meta: {}, abbr: "AB" }); } catch (e: any) { errors.push(`Cover "${c.id}" didn't render: ${e.message}`); } }
    if (ok === lib.templates.length) passed.push(`Every template exports to Word (${ok} tested).`);
    if (!errors.length) passed.push(`Every cover renders (${lib.covers.length} covers).`);
  }
  return { errors, warnings, passed, at: new Date().toISOString() };
}
export const formatChecks = (r: CheckResult) => [r.errors.length ? "PROBLEMS:\n- " + r.errors.join("\n- ") : "No problems.", r.warnings.length ? "Warnings:\n- " + r.warnings.join("\n- ") : "", r.passed.length ? "Passed:\n- " + r.passed.join("\n- ") : ""].filter(Boolean).join("\n");

/** One-line summary of each difference between two libraries, for change cards. */
export function libraryDiff(before: Library, after: Library) {
  const out: Array<{ kind: string; id: string; name: string; change: "added" | "changed" | "removed" }> = [];
  for (const [k, kind] of [["templates", "template"], ["themes", "theme"], ["covers", "cover"], ["fonts", "font"]] as const) {
    const a = new Map<string, any>((before[k] || []).map((x: any) => [x.id, x])), b = new Map<string, any>((after[k] || []).map((x: any) => [x.id, x]));
    for (const [id, x] of b) { if (!a.has(id)) out.push({ kind, id, name: x.name || id, change: "added" }); else if (JSON.stringify(a.get(id)) !== JSON.stringify(x)) out.push({ kind, id, name: x.name || id, change: "changed" }); }
    for (const [id, x] of a) if (!b.has(id)) out.push({ kind, id, name: x.name || id, change: "removed" });
  }
  if (JSON.stringify(before.houseRules) !== JSON.stringify(after.houseRules)) out.push({ kind: "rules", id: "houseRules", name: "Writing rules", change: "changed" });
  if (JSON.stringify(before.categories) !== JSON.stringify(after.categories)) out.push({ kind: "categories", id: "categories", name: "Categories", change: "changed" });
  return out;
}
