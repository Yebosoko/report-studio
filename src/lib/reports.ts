/* Report helpers shared by pages and API routes: new reports, the example, plan limits and library fallbacks. */
import { makeLib, util, DEFAULT_STYLE } from "@/engine/library.js";
import example from "@/engine/seed/example.json";
import type { Brand, Library, Plan, Profile, ReportBody } from "./types";
import type { Repo } from "./repo/types";

export const monthStartISO = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };

export function blankReport(library: Library, templateId: string, brand?: Brand | null): ReportBody {
  const L = makeLib(library); const t = L.tpl(templateId);
  const R: any = {
    templateId: t.id, theme: (brand?.defaultTheme && library.themes.some((x: any) => x.id === brand.defaultTheme)) ? brand.defaultTheme : t.theme,
    cover: t.cover, font: (brand?.defaultFont && library.fonts.some((x: any) => x.id === brand.defaultFont)) ? brand.defaultFont : t.font,
    style: L.styleOf(t), isExample: false, images: {}, logo: null, coverImg: null,
    meta: { title: "", subtitle: "", docType: t.docType, client: "", preparedBy: brand?.preparedBy || "", date: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }), version: "Draft v1.0", abbr: t.abbr },
    sections: t.sections.map((s: any) => ({ title: s.title, hint: s.hint || "", blocks: [] }))
  };
  if (brand?.logo) { R.images.logo = { ...brand.logo }; R.logo = "logo"; }
  return R;
}

export function exampleReport(library: Library): ReportBody {
  const L = makeLib(library); const R: any = util.clone(example); const t = L.tpl(R.templateId);
  Object.assign(R, { isExample: true, images: {}, logo: null, coverImg: null });
  R.sections.forEach((s: any) => { const ts = t.sections.find((x: any) => x.title === s.title); s.hint = ts ? ts.hint : ""; });
  return R;
}

/** If the library no longer has a report's template, theme, cover or font, fall back to defaults and say what changed. */
export function reconcile(library: Library, body: ReportBody): { body: ReportBody; notices: string[] } {
  const notices: string[] = []; const has = (k: string, id: string) => (library[k] || []).some((x: any) => x.id === id);
  const R = body;
  if (!has("templates", R.templateId)) { notices.push("This report's template was removed from the library; it now uses the first template's defaults."); R.templateId = library.templates[0].id; }
  const t = library.templates.find((x: any) => x.id === R.templateId);
  if (!has("themes", R.theme)) { notices.push("Its colour theme was removed; it now uses the template's default theme."); R.theme = t.theme; }
  if (!has("covers", R.cover)) { notices.push("Its cover design was removed; it now uses the template's default cover."); R.cover = t.cover; }
  if (!has("fonts", R.font)) { notices.push("Its typeface pairing was removed; it now uses the template's default."); R.font = t.font; }
  R.style = Object.assign({}, DEFAULT_STYLE, R.style || {});
  if (!R.images) R.images = {};
  if (!Array.isArray(R.sections)) R.sections = [];
  return { body: R, notices };
}

export interface PlanUsage { plan: Plan | null; used: number; limit: number | null; canCreate: boolean; aiEnabled: boolean; templateLimit: number | null }
export async function planUsage(repo: Repo, profile: Profile): Promise<PlanUsage> {
  const plan = await repo.getPlan(profile.planId);
  const owner = profile.role === "owner";
  const used = await repo.countReportsSince(profile.id, monthStartISO());
  const limit = owner ? null : plan?.reportLimit ?? null;
  return { plan, used, limit, canCreate: limit == null || used < limit, aiEnabled: owner || !!plan?.aiEnabled, templateLimit: owner ? null : plan?.templateLimit ?? null };
}

/** Templates a plan may start from: the first N in library order when the plan has a template limit. */
export function allowedTemplateIds(library: Library, templateLimit: number | null): Set<string> {
  const ids = library.templates.map((t: any) => t.id);
  return new Set(templateLimit == null ? ids : ids.slice(0, templateLimit));
}

/** Server-side check of an incoming report body: shape and size only; content is the author's own. */
export function validateBody(b: any): string | null {
  if (!b || typeof b !== "object") return "The report data is missing.";
  if (typeof b.templateId !== "string" || !Array.isArray(b.sections) || typeof b.meta !== "object") return "The report data is in the wrong shape.";
  if (b.sections.length > 80) return "A report can have at most 80 sections.";
  if (JSON.stringify(b).length > 4_000_000) return "This report is too large to save. Remove some content or split it.";
  if (b.images && typeof b.images === "object") for (const v of Object.values<any>(b.images)) if (v && v.path && (typeof v.path !== "string" || v.path.includes(".."))) return "An image reference is invalid.";
  return null;
}
