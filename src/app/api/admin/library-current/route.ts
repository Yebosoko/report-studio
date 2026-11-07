/* GET the library the owner is editing: the draft if there is one, otherwise the published library. */
import { apiOwner, isResponse } from "@/lib/auth";
import { ok } from "@/lib/api";
export async function GET() {
  const s = await apiOwner(); if (isResponse(s)) return s;
  return ok(((await s.repo.getDraft()) || (await s.repo.getPublished())).library);
}
