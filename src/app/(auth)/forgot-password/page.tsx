import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "../AuthForms";
export const metadata: Metadata = { title: "Forgot password" };
export default function Forgot() {
  return <AuthShell title="Reset your password"><p className="-mt-3 mb-5 text-body-sm text-on-surface-variant">Enter the email you signed up with and we'll send a link to choose a new password.</p><ForgotForm /></AuthShell>;
}
