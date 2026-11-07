import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { env, useSupabase } from "@/lib/env";
import { getRepo } from "@/lib/repo";
import { TemplateThumb } from "@/components/Thumb";
import { AuthShell } from "../AuthShell";
import { SignUpForm } from "../AuthForms";
export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";
export default async function SignUp() {
  if (await getSession().catch(() => null)) redirect("/dashboard");
  const library = (await (await getRepo()).getPublished()).library;
  const ids = ["rap", "esia", "sep"].filter(id => library.templates.some((t: any) => t.id === id));
  const aside = (
    <div className="relative mx-auto h-[520px] max-w-[440px]">
      {ids.map((id, i) => <div key={id} className="absolute w-[58%] shadow-paper" style={{ left: `${i * 20}%`, top: `${i * 14}%`, transform: `rotate(${(i - 1) * 4}deg)` }}><TemplateThumb library={library} templateId={id} /></div>)}
    </div>
  );
  return <AuthShell title="Create your account" aside={aside}><SignUpForm google={useSupabase && env.googleSignIn} /></AuthShell>;
}
