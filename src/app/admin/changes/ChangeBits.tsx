/* Small presentational pieces shared by the Studio Lab and the Changes page. */
const ICON: Record<string, string> = { template: "description", theme: "palette", cover: "auto_stories", font: "text_fields", rules: "rule", categories: "category" };
export function DiffRows({ diff }: { diff: Array<{ kind: string; id: string; name: string; change: string }> }) {
  return <ul className="mt-3 space-y-2">{diff.map(d => (
    <li key={d.kind + d.id} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-2.5"><span className="icon text-on-surface-variant" aria-hidden="true">{ICON[d.kind] || "edit"}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-title-sm">{d.name}</span><span className="text-body-sm text-on-surface-variant">library · {d.kind} {d.change}</span></span>
      <span className={`badge ${d.change === "added" ? "bg-tertiary-fixed text-tertiary" : d.change === "removed" ? "bg-error-container text-on-error-container" : "bg-secondary-fixed text-secondary"}`}>{d.change}</span></li>))}</ul>;
}
export function ChecksList({ checks }: { checks: { errors: string[]; warnings: string[]; passed: string[] } }) {
  return <ul className="mt-3 space-y-1 rounded-lg bg-surface-container-low p-3 text-body-sm">
    {checks.errors.map((e, i) => <li key={"e" + i} className="flex gap-2 text-error"><span className="icon text-[16px]" aria-hidden="true">cancel</span>{e}</li>)}
    {checks.warnings.map((e, i) => <li key={"w" + i} className="flex gap-2 text-secondary"><span className="icon text-[16px]" aria-hidden="true">warning</span>{e}</li>)}
    {checks.passed.map((e, i) => <li key={"p" + i} className="flex gap-2"><span className="icon text-[16px] text-tertiary" aria-hidden="true">check_circle</span>{e}</li>)}
  </ul>;
}
