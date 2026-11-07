import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ResetForm } from "../AuthForms";
export const metadata: Metadata = { title: "Choose a new password" };
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthShell title="Choose a new password"><ResetForm token={token} /></AuthShell>;
}
