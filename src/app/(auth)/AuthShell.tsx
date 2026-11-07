import { Logo } from "@/components/Logo";
export function AuthShell({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <main className="gutter min-h-screen bg-desk py-10" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))" }}>
      <div className={`mx-auto grid grid-cols-1 items-center gap-12 ${aside ? "max-w-5xl lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]" : "max-w-md"}`}>
        <div>
          <div className="mb-6 text-center"><div className="inline-block"><Logo /></div><p className="mt-2 text-body-sm text-on-surface-variant">Designed, editable Word reports for safeguards work.</p></div>
          <div className="card p-6 shadow-card sm:p-8"><h1 className="mb-6 font-serif text-headline-sm">{title}</h1>{children}</div>
        </div>
        {aside && <div className="hidden lg:block">{aside}</div>}
      </div>
    </main>
  );
}
