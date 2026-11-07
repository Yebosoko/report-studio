"use client";
import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/lib/types";

export function PricingCards({ plans }: { plans: Plan[] }) {
  const [annual, setAnnual] = useState(false);
  const mult = annual ? 10 : 1; // annual = 10 months' price
  return (
    <>
      <div className="mt-8 inline-flex rounded-lg bg-surface-container p-1" role="group" aria-label="Billing period">
        {[["Monthly", false], ["Annual (2 months free)", true]].map(([l, v]) => (
          <button key={String(l)} type="button" aria-pressed={annual === v} onClick={() => setAnnual(v as boolean)} className={`rounded px-3 py-1.5 text-label-md ${annual === v ? "bg-surface-container-lowest font-semibold shadow-card" : "text-on-surface-variant"}`}>{l as string}</button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((p, i) => (
          <div key={p.id} className={`card flex flex-col p-6 ${i === 1 ? "border-primary-container ring-1 ring-primary-container" : ""}`}>
            <h2 className="text-title-md">{p.name}</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">{p.description}</p>
            <p className="mt-5 font-serif text-headline-lg tabular">{p.priceNgn ? `₦${(p.priceNgn * mult).toLocaleString("en-NG")}` : "Free"}</p>
            <p className="text-body-sm text-on-surface-variant">{p.priceNgn ? `${annual ? "per year" : "per month"} · about $${(p.priceUsd * mult).toLocaleString("en-US")}` : "No card needed"}</p>
            <ul className="mt-5 flex-1 space-y-2 text-body-sm">
              <li className="flex gap-2"><span className="icon text-[18px] text-primary" aria-hidden="true">check</span>{p.reportLimit == null ? "Unlimited reports" : `${p.reportLimit} new reports a month`}</li>
              <li className="flex gap-2"><span className="icon text-[18px] text-primary" aria-hidden="true">check</span>{p.templateLimit == null ? "Every template" : `${p.templateLimit} templates`}</li>
              {p.features.map(f => <li key={f} className="flex gap-2"><span className="icon text-[18px] text-primary" aria-hidden="true">check</span>{f}</li>)}
            </ul>
            <Link href="/signup" className={`btn mt-6 ${i === 1 ? "btn-primary" : ""}`}>{p.priceNgn ? `Choose ${p.name}` : "Start free"}</Link>
          </div>
        ))}
      </div>
    </>
  );
}
