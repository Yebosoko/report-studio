export function PageHead({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0"><p className="micro text-secondary">{eyebrow || "Admin"}</p><h1 className="mt-1 font-serif text-headline-lg">{title}</h1>{intro && <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">{intro}</p>}</div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
