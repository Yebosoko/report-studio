/* PUT {plan} — edit a plan's limits, price or AI access (owner only). */
import { apiOwner, isResponse } from "@/lib/auth";
import { bad, body, ok } from "@/lib/api";

export async function PUT(req: Request) {
  const s = await apiOwner(); if (isResponse(s)) return s;
  const b = await body<{ plan: any }>(req); const p = b?.plan;
  const cur = p?.id ? await s.repo.getPlan(p.id) : null; if (!cur) return bad("Plan not found.", 404);
  const num = (v: any) => (v === null || v === "" ? null : Math.max(0, Math.round(Number(v)) || 0));
  const next = { ...cur, name: String(p.name ?? cur.name).slice(0, 60) || cur.name, description: String(p.description ?? cur.description).slice(0, 300),
    priceNgn: Math.max(0, Number(p.priceNgn ?? cur.priceNgn) || 0), priceUsd: Math.max(0, Number(p.priceUsd ?? cur.priceUsd) || 0),
    reportLimit: p.reportLimit === undefined ? cur.reportLimit : num(p.reportLimit), templateLimit: p.templateLimit === undefined ? cur.templateLimit : num(p.templateLimit),
    aiEnabled: p.aiEnabled === undefined ? cur.aiEnabled : !!p.aiEnabled, active: p.active === undefined ? cur.active : !!p.active };
  await s.repo.savePlan(next);
  await s.repo.audit(s.profile.id, "plan.update", cur.id, { aiEnabled: next.aiEnabled, reportLimit: next.reportLimit, templateLimit: next.templateLimit });
  return ok({ plan: next });
}
