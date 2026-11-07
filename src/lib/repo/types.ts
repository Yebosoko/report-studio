import type { AuditRow, Brand, ChangeSet, LabThread, Library, LibraryVersion, Plan, Profile, ReportBody, ReportRow, ReportSummary, Sample, Settings, UsageRow } from "../types";

/** Data access for one request. Member methods are scoped to the signed-in user; owner methods are only called after requireOwner. */
export interface Repo {
  mode: "supabase" | "local";
  // Profiles
  getProfile(id: string): Promise<Profile | null>;
  updateOwnProfile(id: string, patch: Partial<Pick<Profile, "name" | "organisation" | "jobRole">>): Promise<void>;
  touchProfile(id: string): Promise<void>;
  listProfiles(): Promise<Profile[]>;
  adminUpdateProfile(id: string, patch: Partial<Pick<Profile, "planId" | "status">>): Promise<void>;
  // Plans
  listPlans(includeInactive?: boolean): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | null>;
  savePlan(plan: Plan): Promise<void>;
  // Reports
  listReports(userId: string): Promise<ReportSummary[]>;
  getReport(userId: string, id: string): Promise<ReportRow | null>;
  createReport(userId: string, body: ReportBody, draftText?: string): Promise<string>;
  updateReport(userId: string, id: string, body: ReportBody): Promise<string>;
  updateDraft(userId: string, id: string, text: string): Promise<void>;
  deleteReport(userId: string, id: string): Promise<void>;
  countReportsSince(userId: string, iso: string): Promise<number>;
  countAllReportsSince(iso: string): Promise<number>;
  // Brand
  getBrand(userId: string): Promise<Brand>;
  saveBrand(userId: string, brand: Brand): Promise<void>;
  // Files ("<bucket>/<object path>")
  putFile(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  getFile(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  removeFiles(paths: string[]): Promise<void>;
  // Library
  getPublished(): Promise<LibraryVersion>;
  getDraft(): Promise<LibraryVersion | null>;
  saveDraft(library: Library, note: string, createdBy: string): Promise<LibraryVersion>;
  discardDraft(): Promise<void>;
  publishDraft(note: string): Promise<LibraryVersion>;
  publishCopyOf(versionId: string, note: string, kind: string): Promise<LibraryVersion>;
  listVersions(limit?: number): Promise<LibraryVersion[]>;
  // Samples
  listSamples(): Promise<Sample[]>;
  getSample(id: string): Promise<Sample | null>;
  saveSample(s: Partial<Sample> & { name: string }): Promise<Sample>;
  deleteSample(id: string): Promise<void>;
  // Studio Lab
  getThread(): Promise<LabThread>;
  saveThread(t: LabThread): Promise<void>;
  getPendingChangeSet(): Promise<ChangeSet | null>;
  saveChangeSet(cs: Partial<ChangeSet>): Promise<ChangeSet>;
  listChangeSets(limit?: number): Promise<ChangeSet[]>;
  // Settings, usage, events, audit
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  logUsage(row: Omit<UsageRow, "createdAt">): Promise<void>;
  usageSince(iso: string): Promise<UsageRow[]>;
  logEvent(userId: string, type: string, detail?: any): Promise<void>;
  countEventsSince(type: string, iso: string): Promise<number>;
  eventsByWeek(type: string, weeks: number): Promise<Array<{ week: string; count: number }>>;
  audit(actor: string, action: string, target?: string, detail?: any): Promise<void>;
  listAudit(limit?: number): Promise<AuditRow[]>;
  // Account
  deleteUserData(userId: string): Promise<void>;
}
