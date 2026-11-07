/* PUT the signed-in user's brand kit. */
import { apiUser, isResponse } from "@/lib/auth";
import { bad, body, canAccessPath, ok } from "@/lib/api";

export async function PUT(req: Request) {
  const s = await apiUser(); if (isResponse(s)) return s;
  const b = await body<any>(req); if (!b) return bad("Missing brand details.");
  const str = (v: any, n = 200) => String(v ?? "").trim().slice(0, n);
  const logo = b.logo && typeof b.logo.path === "string" && canAccessPath(s.profile, b.logo.path) ? { path: b.logo.path, w: +b.logo.w || 300, h: +b.logo.h || 100 } : null;
  await s.repo.saveBrand(s.profile.id, { preparedBy: str(b.preparedBy), logo, defaultTheme: b.defaultTheme ? str(b.defaultTheme, 40) : null, defaultFont: b.defaultFont ? str(b.defaultFont, 40) : null, contactEmail: str(b.contactEmail), contactPhone: str(b.contactPhone, 40) });
  return ok();
}
