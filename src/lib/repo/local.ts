/* Local development store: one JSON file in .data/ plus files under .data/files/. Used when Supabase isn't configured,
   so the whole app runs on a laptop (and in automated tests) without accounts. Not for production. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Repo } from "./types";
import { DEFAULT_SETTINGS } from "../types";
import type { AuditRow, Brand, ChangeSet, LabThread, LibraryVersion, Plan, Profile, ReportRow, Sample, Settings, UsageRow } from "../types";
import seedLibrary from "@/engine/seed/library.json";

const DIR = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "db.json");
const FILES = path.join(DIR, "files");

export interface LocalUser { id: string; email: string; salt: string; hash: string; meta: Record<string, string>; createdAt: string }
interface DB {
  users: LocalUser[]; profiles: Profile[]; plans: Plan[]; reports: ReportRow[] & any[]; brands: Record<string, Brand>;
  library: LibraryVersion[]; samples: Sample[]; thread: LabThread; changeSets: ChangeSet[]; settings: Settings;
  usage: UsageRow[]; events: Array<{ userId: string; type: string; detail: any; createdAt: string }>; audit: AuditRow[];
  resetTokens: Array<{ token: string; userId: string; exp: number }>;
}
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

export const SEED_PLANS: Plan[] = [
  { id: "starter", name: "Starter", description: "Try the studio on real work.", priceNgn: 0, priceUsd: 0, reportLimit: 2, templateLimit: 4, aiEnabled: false, features: ["2 reports a month", "4 templates", "Editable Word export"], sort: 1, active: true },
  { id: "professional", name: "Professional", description: "For consultants with a steady flow of reports.", priceNgn: 15000, priceUsd: 10, reportLimit: null, templateLimit: null, aiEnabled: false, features: ["Unlimited reports", "All templates", "Your logo and brand"], sort: 2, active: true },
  { id: "firm", name: "Firm", description: "For consultancies producing reports every week.", priceNgn: 45000, priceUsd: 30, reportLimit: null, templateLimit: null, aiEnabled: false, features: ["Unlimited reports", "All templates", "Priority new templates"], sort: 3, active: true }
];

function empty(): DB {
  return {
    users: [], profiles: [], plans: structuredClone(SEED_PLANS), reports: [], brands: {},
    library: [{ id: uuid(), versionNo: 1, status: "published", library: structuredClone(seedLibrary), note: "First library: 12 templates, 8 themes, 5 covers", createdBy: "seed", kind: "seed", createdAt: now(), publishedAt: now() }],
    samples: [], thread: { turns: [], pending: null }, changeSets: [], settings: { ...DEFAULT_SETTINGS }, usage: [], events: [], audit: [], resetTokens: []
  };
}
export function readDB(): DB {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { const d = empty(); writeDB(d); return d; }
}
export function writeDB(d: DB) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(d));
  fs.renameSync(tmp, FILE);
}
function mutate<T>(fn: (d: DB) => T): T { const d = readDB(); const r = fn(d); writeDB(d); return r; }
const summary = (r: any) => ({ id: r.id, title: r.title, templateId: r.templateId, docType: r.docType, theme: r.theme, cover: r.cover, font: r.font, client: r.client, createdAt: r.createdAt, updatedAt: r.updatedAt });
function denorm(body: any) {
  const m = body?.meta || {};
  return { title: m.title || "", templateId: body?.templateId || "", docType: m.docType || "", theme: body?.theme || "", cover: body?.cover || "", font: body?.font || "", client: m.client || "" };
}
function safePath(p: string) {
  const full = path.normalize(path.join(FILES, p));
  if (!full.startsWith(FILES + path.sep)) throw new Error("Bad file path");
  return full;
}

export function localRepo(): Repo {
  return {
    mode: "local",
    async getProfile(id) { return readDB().profiles.find(p => p.id === id) || null; },
    async updateOwnProfile(id, patch) { mutate(d => { const p = d.profiles.find(x => x.id === id); if (p) Object.assign(p, patch); }); },
    async touchProfile(id) { mutate(d => { const p = d.profiles.find(x => x.id === id); if (p) p.lastActiveAt = now(); }); },
    async listProfiles() { return readDB().profiles.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    async adminUpdateProfile(id, patch) { mutate(d => { const p = d.profiles.find(x => x.id === id); if (p) Object.assign(p, patch); }); },

    async listPlans(includeInactive) { return readDB().plans.filter(p => includeInactive || p.active).sort((a, b) => a.sort - b.sort); },
    async getPlan(id) { return readDB().plans.find(p => p.id === id) || null; },
    async savePlan(plan) { mutate(d => { const i = d.plans.findIndex(p => p.id === plan.id); if (i >= 0) d.plans[i] = plan; else d.plans.push(plan); }); },

    async listReports(userId) { return readDB().reports.filter((r: any) => r.userId === userId).map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
    async getReport(userId, id) { const r: any = readDB().reports.find((x: any) => x.id === id && x.userId === userId); return r ? { ...summary(r), body: r.body, draftText: r.draftText || "" } : null; },
    async createReport(userId, body, draftText) {
      const id = uuid(); const t = now();
      mutate(d => { (d.reports as any[]).push({ id, userId, ...denorm(body), body, draftText: draftText || "", createdAt: t, updatedAt: t }); });
      return id;
    },
    async updateReport(userId, id, body) {
      const t = now();
      mutate(d => { const r: any = d.reports.find((x: any) => x.id === id && x.userId === userId); if (!r) throw new Error("Report not found"); Object.assign(r, denorm(body), { body, updatedAt: t }); });
      return t;
    },
    async updateDraft(userId, id, text) { mutate(d => { const r: any = d.reports.find((x: any) => x.id === id && x.userId === userId); if (r) r.draftText = text; }); },
    async deleteReport(userId, id) { mutate(d => { d.reports = d.reports.filter((x: any) => !(x.id === id && x.userId === userId)) as any; }); },
    async countReportsSince(userId, iso) { return readDB().reports.filter((r: any) => r.userId === userId && r.createdAt >= iso).length; },
    async countAllReportsSince(iso) { return readDB().reports.filter((r: any) => r.createdAt >= iso).length; },

    async getBrand(userId) { return readDB().brands[userId] || { preparedBy: "", logo: null, defaultTheme: null, defaultFont: null, contactEmail: "", contactPhone: "" }; },
    async saveBrand(userId, brand) { mutate(d => { d.brands[userId] = brand; }); },

    async putFile(p, bytes, contentType) { const f = safePath(p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, bytes); fs.writeFileSync(f + ".type", contentType); },
    async getFile(p) { try { const f = safePath(p); return { bytes: new Uint8Array(fs.readFileSync(f)), contentType: fs.existsSync(f + ".type") ? fs.readFileSync(f + ".type", "utf8") : "application/octet-stream" }; } catch { return null; } },
    async removeFiles(paths) { for (const p of paths) { try { const f = safePath(p); fs.rmSync(f, { force: true }); fs.rmSync(f + ".type", { force: true }); } catch { /* ignore */ } } },

    async getPublished() { const v = readDB().library.find(x => x.status === "published"); if (!v) throw new Error("No published library"); return v; },
    async getDraft() { return readDB().library.find(x => x.status === "draft") || null; },
    async saveDraft(library, note, createdBy) {
      return mutate(d => {
        let v = d.library.find(x => x.status === "draft");
        if (v) { v.library = library; v.note = note || v.note; v.createdBy = createdBy; }
        else { v = { id: uuid(), versionNo: Math.max(...d.library.map(x => x.versionNo)) + 1, status: "draft", library, note, createdBy, kind: "change", createdAt: now(), publishedAt: null }; d.library.push(v); }
        return structuredClone(v);
      });
    },
    async discardDraft() { mutate(d => { d.library = d.library.filter(x => x.status !== "draft"); }); },
    async publishDraft(note) {
      return mutate(d => {
        const v = d.library.find(x => x.status === "draft"); if (!v) throw new Error("There are no pending library changes.");
        d.library.forEach(x => { if (x.status === "published") x.status = "retired"; });
        v.status = "published"; v.publishedAt = now(); if (note) v.note = note;
        return structuredClone(v);
      });
    },
    async publishCopyOf(versionId, note, kind) {
      return mutate(d => {
        const src = d.library.find(x => x.id === versionId); if (!src) throw new Error("Version not found");
        d.library = d.library.filter(x => x.status !== "draft");
        d.library.forEach(x => { if (x.status === "published") x.status = "retired"; });
        const v: LibraryVersion = { id: uuid(), versionNo: Math.max(...d.library.map(x => x.versionNo)) + 1, status: "published", library: structuredClone(src.library), note, createdBy: "owner", kind, createdAt: now(), publishedAt: now() };
        d.library.push(v); return structuredClone(v);
      });
    },
    async listVersions(limit = 50) { return readDB().library.slice().sort((a, b) => b.versionNo - a.versionNo).slice(0, limit); },

    async listSamples() { return readDB().samples.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    async getSample(id) { return readDB().samples.find(s => s.id === id) || null; },
    async saveSample(s) {
      return mutate(d => {
        const i = s.id ? d.samples.findIndex(x => x.id === s.id) : -1;
        const base: Sample = i >= 0 ? d.samples[i] : { id: uuid(), name: s.name, organisation: "", notes: "", kind: "PDF", pageCount: null, pages: [], textExcerpt: "", study: null, studyError: null, createdAt: now(), updatedAt: now() };
        const v = { ...base, ...s, id: base.id, updatedAt: now() } as Sample;
        if (i >= 0) d.samples[i] = v; else d.samples.push(v);
        return structuredClone(v);
      });
    },
    async deleteSample(id) { mutate(d => { d.samples = d.samples.filter(s => s.id !== id); }); },

    async getThread() { return readDB().thread || { turns: [], pending: null }; },
    async saveThread(t) { mutate(d => { d.thread = t; }); },
    async getPendingChangeSet() { return readDB().changeSets.find(c => c.status === "pending") || null; },
    async saveChangeSet(cs) {
      return mutate(d => {
        const i = cs.id ? d.changeSets.findIndex(x => x.id === cs.id) : -1;
        const base: ChangeSet = i >= 0 ? d.changeSets[i] : { id: uuid(), kind: "library", status: "pending", summary: "", steps: [], checks: null, libraryVersionId: null, createdAt: now(), updatedAt: now() };
        const v = { ...base, ...cs, id: base.id, updatedAt: now() } as ChangeSet;
        if (i >= 0) d.changeSets[i] = v; else d.changeSets.push(v);
        return structuredClone(v);
      });
    },
    async listChangeSets(limit = 50) { return readDB().changeSets.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); },

    async getSettings() { return { ...DEFAULT_SETTINGS, ...(readDB().settings || {}) }; },
    async saveSettings(patch) { return mutate(d => { d.settings = { ...DEFAULT_SETTINGS, ...d.settings, ...patch }; return d.settings; }); },
    async logUsage(row) { mutate(d => { d.usage.push({ ...row, createdAt: now() }); }); },
    async usageSince(iso) { return readDB().usage.filter(u => u.createdAt >= iso); },
    async logEvent(userId, type, detail) { mutate(d => { d.events.push({ userId, type, detail: detail || null, createdAt: now() }); }); },
    async countEventsSince(type, iso) { return readDB().events.filter(e => e.type === type && e.createdAt >= iso).length; },
    async eventsByWeek(type, weeks) { return bucketWeeks(readDB().events.filter(e => e.type === type).map(e => e.createdAt), weeks); },
    async audit(actor, action, target = "", detail) { mutate(d => { d.audit.push({ id: d.audit.length + 1, actor, action, target, detail: detail || null, createdAt: now() }); }); },
    async listAudit(limit = 30) { return readDB().audit.slice(-limit).reverse(); },

    async deleteUserData(userId) {
      const d = readDB();
      const imgs = (d.reports as any[]).filter(r => r.userId === userId).flatMap(r => Object.values(r.body?.images || {}).map((x: any) => x.path).filter(Boolean));
      const logo = d.brands[userId]?.logo?.path;
      d.reports = (d.reports as any[]).filter(r => r.userId !== userId) as any;
      delete d.brands[userId];
      d.profiles = d.profiles.filter(p => p.id !== userId);
      d.users = d.users.filter(u => u.id !== userId);
      writeDB(d);
      await this.removeFiles([...imgs, ...(logo ? [logo] : [])]);
    }
  };
}

/** Counts per ISO week (Monday) for the last N weeks, oldest first. */
export function bucketWeeks(dates: string[], weeks: number) {
  const out: Array<{ week: string; count: number }> = [];
  const monday = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - day); return x; };
  const start = monday(new Date()); start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1));
  for (let i = 0; i < weeks; i++) { const w = new Date(start); w.setUTCDate(start.getUTCDate() + 7 * i); out.push({ week: w.toISOString().slice(0, 10), count: 0 }); }
  for (const s of dates) { const k = monday(new Date(s)).toISOString().slice(0, 10); const b = out.find(o => o.week === k); if (b) b.count++; }
  return out;
}
