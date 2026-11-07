import { requireOwnerPage } from "@/lib/auth";
import { monthStartISO } from "@/lib/reports";
import { PageHead } from "../PageHead";
import { UsersClient } from "./UsersClient";

export const metadata = { title: "Users & plans" };
export default async function Users() {
  const { repo, profile } = await requireOwnerPage();
  const [profiles, plans] = await Promise.all([repo.listProfiles(), repo.listPlans(true)]);
  const since = monthStartISO();
  const counts: Record<string, number> = {};
  await Promise.all(profiles.map(async p => { counts[p.id] = await repo.countReportsSince(p.id, since).catch(() => 0); }));
  return (<>
    <PageHead title="Users & plans" intro="Members, their plans, and what each plan includes. Member AI is off unless you switch it on for a plan." />
    <UsersClient me={profile.id} users={profiles.map(p => ({ ...p, reportsMonth: counts[p.id] || 0 }))} plans={plans} />
  </>);
}
