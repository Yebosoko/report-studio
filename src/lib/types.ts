/* Shared server/client types. The library and report body follow the engine's JSON formats (docs/ARCHITECTURE.md). */
export type Role = "owner" | "member";
export type Library = any;
export type ReportBody = any;

export interface Profile {
  id: string; email: string; name: string; organisation: string; jobRole: string;
  role: Role; planId: string; status: "active" | "suspended"; createdAt: string; lastActiveAt?: string | null;
}
export interface Plan {
  id: string; name: string; description: string; priceNgn: number; priceUsd: number;
  reportLimit: number | null; templateLimit: number | null; aiEnabled: boolean; features: string[]; sort: number; active: boolean;
}
export interface ReportSummary {
  id: string; title: string; templateId: string; docType: string; theme: string; cover: string; font: string; client: string;
  createdAt: string; updatedAt: string;
}
export interface ReportRow extends ReportSummary { body: ReportBody; draftText: string }
/** A stored image. path = "<bucket>/<object path>", served by /api/files/<path>. */
export interface ImageRef { path: string; w: number; h: number }
export interface Brand {
  preparedBy: string; logo: ImageRef | null; defaultTheme: string | null; defaultFont: string | null; contactEmail: string; contactPhone: string;
}
export interface LibraryVersion {
  id: string; versionNo: number; status: "draft" | "published" | "retired"; library: Library; note: string;
  createdBy: string; kind: string; createdAt: string; publishedAt: string | null;
}
export interface Sample {
  id: string; name: string; organisation: string; notes: string; kind: string; pageCount: number | null;
  pages: Array<ImageRef & { page: number }>; textExcerpt: string; study: any; studyError: string | null; createdAt: string; updatedAt: string;
}
export interface LabTurn { role: "user" | "assistant"; text: string; at: string; steps?: string[]; attach?: string[]; status?: string }
export interface LabThread { turns: LabTurn[]; pending: any | null }
export interface ChangeSet {
  id: string; kind: "library" | "code"; status: "pending" | "applied" | "discarded" | "rolled_back"; summary: string;
  steps: string[]; checks: any; libraryVersionId: string | null; createdAt: string; updatedAt: string;
}
export interface Settings {
  labModel: string; memberModel: string; studyModel: string; monthlyBudgetUsd: number; stopAtCap: boolean; ngnPerUsd: number;
  prices: Record<string, { in: number; out: number }>;
}
export interface UsageRow { userId: string | null; feature: string; model: string; inputTokens: number; outputTokens: number; costUsd: number; createdAt: string }
export interface AuditRow { id: number | string; actor: string; action: string; target: string; detail: any; createdAt: string }

export const DEFAULT_SETTINGS: Settings = {
  labModel: "claude-opus-5-5", memberModel: "claude-sonnet-5-5", studyModel: "claude-sonnet-5-5",
  monthlyBudgetUsd: 50, stopAtCap: true, ngnPerUsd: 1500, prices: {}
};
export const MODEL_CHOICES = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
