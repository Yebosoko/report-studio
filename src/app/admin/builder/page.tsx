import { requireOwnerPage } from "@/lib/auth";
import { PageHead } from "../PageHead";
import { Builder } from "./Builder";

export const metadata = { title: "Templates & covers" };
export default async function BuilderPage() {
  const { repo } = await requireOwnerPage();
  const draft = await repo.getDraft();
  const lib = (draft || await repo.getPublished()).library;
  return (<>
    <PageHead title="Templates & covers" intro={`Edit templates, themes and cover layouts. Saving creates a pending change for review${draft ? " (you're editing the current draft)" : ""}.`} />
    <Builder initial={lib} />
  </>);
}
