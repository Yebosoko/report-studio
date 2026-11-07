/* Production store on Supabase. `db` acts as the signed-in user (row level security applies); `svc` is the service-role
   client, used only for writes no user policy allows (usage and audit logs, owner role assignment, account deletion). */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repo } from "./types";
import { DEFAULT_SETTINGS } from "../types";
import type { Brand, ChangeSet, LibraryVersion, Plan, Profile, Sample } from "../types";
import { bucketWeeks } from "./local";

const must = <T>(r: { data: T; error: any }): NonNullable<T> => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data as NonNullable<T>; };
const maybe = <T>(r: { data: T; error: any }): T => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; };
const splitPath = (p: string) => { const i = p.indexOf("/"); return { bucket: p.slice(0, i), key: p.slice(i + 1) }; };

const toProfile = (r: any): Profile => ({ id: r.id, email: r.email, name: r.name || "", organisation: r.organisation || "", jobRole: r.job_role || "", role: r.role, planId: r.plan_id || "starter", status: r.status, createdAt: r.created_at, lastActiveAt: r.last_active_at });
const toPlan = (r: any): Plan => ({ id: r.id, name: r.name, description: r.description || "", priceNgn: r.price_ngn, priceUsd: Number(r.price_usd), reportLimit: r.report_limit, templateLimit: r.template_limit, aiEnabled: !!r.ai_enabled, features: r.features || [], sort: r.sort, active: r.active });
const fromPlan = (p: Plan) => ({ id: p.id, name: p.name, description: p.description, price_ngn: p.priceNgn, price_usd: p.priceUsd, report_limit: p.reportLimit, template_limit: p.templateLimit, ai_enabled: p.aiEnabled, features: p.features, sort: p.sort, active: p.active });
const toSummary = (r: any) => ({ id: r.id, title: r.title, templateId: r.template_id, docType: r.doc_type, theme: r.theme, cover: r.cover, font: r.font, client: r.client, createdAt: r.created_at, updatedAt: r.updated_at });
const toVersion = (r: any): LibraryVersion => ({ id: r.id, versionNo: r.version_no, status: r.status, library: r.library, note: r.note, createdBy: r.created_by, kind: r.kind, createdAt: r.created_at, publishedAt: r.published_at });
const toSample = (r: any): Sample => ({ id: r.id, name: r.name, organisation: r.organisation, notes: r.notes, kind: r.kind, pageCount: r.page_count, pages: r.pages || [], textExcerpt: r.text_excerpt || "", study: r.study, studyError: r.study_error, createdAt: r.created_at, updatedAt: r.updated_at });
const toChange = (r: any): ChangeSet => ({ id: r.id, kind: r.kind, status: r.status, summary: r.summary, steps: r.steps || [], checks: r.checks, libraryVersionId: r.library_version_id, createdAt: r.created_at, updatedAt: r.updated_at });
function denorm(body: any) {
  const m = body?.meta || {};
  return { title: m.title || "", template_id: body?.templateId || "", doc_type: m.docType || "", theme: body?.theme || "", cover: body?.cover || "", font: body?.font || "", client: m.client || "" };
}
const SUMMARY_COLS = "id,title,template_id,doc_type,theme,cover,font,client,created_at,updated_at";

export function supabaseRepo(db: SupabaseClient, svc: SupabaseClient): Repo {
  return {
    mode: "supabase",
    async getProfile(id) { const r = maybe(await db.from("profiles").select("*").eq("id", id).maybeSingle()); return r ? toProfile(r) : null; },
    async updateOwnProfile(id, patch) { must(await db.from("profiles").update({ name: patch.name, organisation: patch.organisation, job_role: patch.jobRole }).eq("id", id)); },
    async touchProfile(id) { await svc.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", id); },
    async listProfiles() { return must(await db.from("profiles").select("*").order("created_at", { ascending: false })).map(toProfile); },
    async adminUpdateProfile(id, patch) { const u: any = {}; if (patch.planId) u.plan_id = patch.planId; if (patch.status) u.status = patch.status; must(await db.from("profiles").update(u).eq("id", id)); },

    async listPlans(includeInactive) { let q = db.from("plans").select("*").order("sort"); if (!includeInactive) q = q.eq("active", true); return must(await q).map(toPlan); },
    async getPlan(id) { const r = maybe(await db.from("plans").select("*").eq("id", id).maybeSingle()); return r ? toPlan(r) : null; },
    async savePlan(plan) { must(await db.from("plans").upsert(fromPlan(plan))); },

    async listReports(userId) { return must(await db.from("reports").select(SUMMARY_COLS).eq("user_id", userId).order("updated_at", { ascending: false })).map(toSummary); },
    async getReport(userId, id) { const r = maybe(await db.from("reports").select("*").eq("id", id).eq("user_id", userId).maybeSingle()); return r ? { ...toSummary(r), body: r.body, draftText: r.draft_text || "" } : null; },
    async createReport(userId, body, draftText) { const r = must(await db.from("reports").insert({ user_id: userId, ...denorm(body), body, draft_text: draftText || "" }).select("id").single()); return (r as any).id; },
    async updateReport(userId, id, body) { const t = new Date().toISOString(); must(await db.from("reports").update({ ...denorm(body), body, updated_at: t }).eq("id", id).eq("user_id", userId)); return t; },
    async updateDraft(userId, id, text) { must(await db.from("reports").update({ draft_text: text }).eq("id", id).eq("user_id", userId)); },
    async deleteReport(userId, id) { must(await db.from("reports").delete().eq("id", id).eq("user_id", userId)); },
    async countReportsSince(userId, iso) { const r = await db.from("reports").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", iso); return r.count || 0; },
    async countAllReportsSince(iso) { const r = await svc.from("reports").select("id", { count: "exact", head: true }).gte("created_at", iso); return r.count || 0; },

    async getBrand(userId) {
      const r = maybe(await db.from("brand_kits").select("*").eq("user_id", userId).maybeSingle());
      return r ? { preparedBy: r.prepared_by, logo: r.logo, defaultTheme: r.default_theme, defaultFont: r.default_font, contactEmail: r.contact_email, contactPhone: r.contact_phone } as Brand
        : { preparedBy: "", logo: null, defaultTheme: null, defaultFont: null, contactEmail: "", contactPhone: "" };
    },
    async saveBrand(userId, b) { must(await db.from("brand_kits").upsert({ user_id: userId, prepared_by: b.preparedBy, logo: b.logo, default_theme: b.defaultTheme, default_font: b.defaultFont, contact_email: b.contactEmail, contact_phone: b.contactPhone, updated_at: new Date().toISOString() })); },

    async putFile(p, bytes, contentType) { const { bucket, key } = splitPath(p); must(await db.storage.from(bucket).upload(key, bytes, { contentType, upsert: true })); },
    async getFile(p) {
      const { bucket, key } = splitPath(p);
      const r = await db.storage.from(bucket).download(key);
      if (r.error || !r.data) return null;
      return { bytes: new Uint8Array(await r.data.arrayBuffer()), contentType: r.data.type || "application/octet-stream" };
    },
    async removeFiles(paths) {
      const byBucket: Record<string, string[]> = {};
      paths.forEach(p => { const { bucket, key } = splitPath(p); (byBucket[bucket] = byBucket[bucket] || []).push(key); });
      for (const [b, keys] of Object.entries(byBucket)) await svc.storage.from(b).remove(keys);
    },

    async getPublished() { const r = maybe(await db.from("library_versions").select("*").eq("status", "published").maybeSingle()); if (!r) throw new Error("No published library. Run supabase/seed.sql."); return toVersion(r); },
    async getDraft() { const r = maybe(await db.from("library_versions").select("*").eq("status", "draft").maybeSingle()); return r ? toVersion(r) : null; },
    async saveDraft(library, note, createdBy) {
      const existing = maybe(await db.from("library_versions").select("id").eq("status", "draft").maybeSingle());
      if (existing) return toVersion(must(await db.from("library_versions").update({ library, note, created_by: createdBy }).eq("id", (existing as any).id).select("*").single()));
      const max = must(await db.from("library_versions").select("version_no").order("version_no", { ascending: false }).limit(1));
      const versionNo = ((max as any[])[0]?.version_no || 0) + 1;
      return toVersion(must(await db.from("library_versions").insert({ version_no: versionNo, status: "draft", library, note, created_by: createdBy, kind: "change" }).select("*").single()));
    },
    async discardDraft() { must(await db.from("library_versions").delete().eq("status", "draft")); },
    async publishDraft(note) {
      const draft = maybe(await db.from("library_versions").select("id").eq("status", "draft").maybeSingle());
      if (!draft) throw new Error("There are no pending library changes.");
      must(await db.from("library_versions").update({ status: "retired" }).eq("status", "published"));
      return toVersion(must(await db.from("library_versions").update({ status: "published", published_at: new Date().toISOString(), ...(note ? { note } : {}) }).eq("id", (draft as any).id).select("*").single()));
    },
    async publishCopyOf(versionId, note, kind) {
      const src = must(await db.from("library_versions").select("*").eq("id", versionId).single());
      must(await db.from("library_versions").delete().eq("status", "draft"));
      const max = must(await db.from("library_versions").select("version_no").order("version_no", { ascending: false }).limit(1));
      const versionNo = ((max as any[])[0]?.version_no || 0) + 1;
      must(await db.from("library_versions").update({ status: "retired" }).eq("status", "published"));
      return toVersion(must(await db.from("library_versions").insert({ version_no: versionNo, status: "published", library: (src as any).library, note, created_by: "owner", kind, published_at: new Date().toISOString() }).select("*").single()));
    },
    async listVersions(limit = 50) { return must(await db.from("library_versions").select("*").order("version_no", { ascending: false }).limit(limit)).map(toVersion); },

    async listSamples() { return must(await db.from("samples").select("*").order("created_at", { ascending: false })).map(toSample); },
    async getSample(id) { const r = maybe(await db.from("samples").select("*").eq("id", id).maybeSingle()); return r ? toSample(r) : null; },
    async saveSample(s) {
      const row: any = { name: s.name, updated_at: new Date().toISOString() };
      if (s.organisation !== undefined) row.organisation = s.organisation; if (s.notes !== undefined) row.notes = s.notes; if (s.kind !== undefined) row.kind = s.kind;
      if (s.pageCount !== undefined) row.page_count = s.pageCount; if (s.pages !== undefined) row.pages = s.pages; if (s.textExcerpt !== undefined) row.text_excerpt = s.textExcerpt;
      if (s.study !== undefined) row.study = s.study; if (s.studyError !== undefined) row.study_error = s.studyError;
      if (s.id) return toSample(must(await db.from("samples").update(row).eq("id", s.id).select("*").single()));
      return toSample(must(await db.from("samples").insert(row).select("*").single()));
    },
    async deleteSample(id) { must(await db.from("samples").delete().eq("id", id)); },

    async getThread() { const r = maybe(await db.from("lab_threads").select("*").eq("id", "main").maybeSingle()); return r ? { turns: (r as any).turns || [], pending: (r as any).pending } : { turns: [], pending: null }; },
    async saveThread(t) { must(await db.from("lab_threads").upsert({ id: "main", turns: t.turns, pending: t.pending, updated_at: new Date().toISOString() })); },
    async getPendingChangeSet() { const r = must(await db.from("change_sets").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(1)); return (r as any[])[0] ? toChange((r as any[])[0]) : null; },
    async saveChangeSet(cs) {
      const row: any = { updated_at: new Date().toISOString() };
      if (cs.kind) row.kind = cs.kind; if (cs.status) row.status = cs.status; if (cs.summary !== undefined) row.summary = cs.summary;
      if (cs.steps) row.steps = cs.steps; if (cs.checks !== undefined) row.checks = cs.checks; if (cs.libraryVersionId !== undefined) row.library_version_id = cs.libraryVersionId;
      if (cs.id) return toChange(must(await db.from("change_sets").update(row).eq("id", cs.id).select("*").single()));
      return toChange(must(await db.from("change_sets").insert(row).select("*").single()));
    },
    async listChangeSets(limit = 50) { return must(await db.from("change_sets").select("*").order("created_at", { ascending: false }).limit(limit)).map(toChange); },

    async getSettings() { const r = maybe(await svc.from("app_settings").select("settings").eq("id", "main").maybeSingle()); return { ...DEFAULT_SETTINGS, ...((r as any)?.settings || {}) }; },
    async saveSettings(patch) { const cur = await this.getSettings(); const next = { ...cur, ...patch }; must(await db.from("app_settings").upsert({ id: "main", settings: next, updated_at: new Date().toISOString() })); return next; },
    async logUsage(u) { await svc.from("ai_usage").insert({ user_id: u.userId, feature: u.feature, model: u.model, input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_usd: u.costUsd }); },
    async usageSince(iso) { return must(await svc.from("ai_usage").select("*").gte("created_at", iso)).map((r: any) => ({ userId: r.user_id, feature: r.feature, model: r.model, inputTokens: r.input_tokens, outputTokens: r.output_tokens, costUsd: Number(r.cost_usd), createdAt: r.created_at })); },
    async logEvent(userId, type, detail) { await db.from("events").insert({ user_id: userId, type, detail: detail || null }); },
    async countEventsSince(type, iso) { const r = await svc.from("events").select("id", { count: "exact", head: true }).eq("type", type).gte("created_at", iso); return r.count || 0; },
    async eventsByWeek(type, weeks) {
      const since = new Date(Date.now() - weeks * 7 * 864e5).toISOString();
      const rows = must(await svc.from("events").select("created_at").eq("type", type).gte("created_at", since));
      return bucketWeeks((rows as any[]).map(r => r.created_at), weeks);
    },
    async audit(actor, action, target = "", detail) { await svc.from("audit_log").insert({ actor, action, target, detail: detail || null }); },
    async listAudit(limit = 30) { return must(await db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit)).map((r: any) => ({ id: r.id, actor: r.actor, action: r.action, target: r.target, detail: r.detail, createdAt: r.created_at })); },

    async deleteUserData(userId) {
      const reports = must(await svc.from("reports").select("body").eq("user_id", userId));
      const brand = maybe(await svc.from("brand_kits").select("logo").eq("user_id", userId).maybeSingle());
      const paths = (reports as any[]).flatMap(r => Object.values(r.body?.images || {}).map((x: any) => x?.path).filter(Boolean));
      if ((brand as any)?.logo?.path) paths.push((brand as any).logo.path);
      if (paths.length) await this.removeFiles(paths);
      must(await svc.auth.admin.deleteUser(userId) as any);   // cascades to profiles, reports, brand kits
    }
  };
}
