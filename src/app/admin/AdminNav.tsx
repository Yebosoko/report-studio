"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<[string, string, string]> = [["/admin", "Overview", "dashboard"], ["/admin/lab", "Studio Lab", "science"], ["/admin/samples", "Samples", "photo_library"], ["/admin/builder", "Templates & covers", "layers"], ["/admin/changes", "Changes & versions", "history"], ["/admin/users", "Users & plans", "group"], ["/admin/ai", "AI settings", "tune"]];
export function AdminNav({ pending, unstudied }: { pending: number; unstudied: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="border-b border-outline-variant bg-surface-container-low lg:min-h-[calc(100vh-90px)] lg:border-b-0 lg:border-r">
      <p className="micro hidden px-5 pb-2 pt-6 lg:block">Admin workspace</p>
      <ul className="gutter flex gap-1 overflow-x-auto py-2 lg:block lg:space-y-0.5 lg:px-3">
        {ITEMS.map(([href, label, icon]) => {
          const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
          const dot = (href === "/admin/changes" && pending > 0) || (href === "/admin/samples" && unstudied > 0);
          return <li key={href}><Link href={href} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-label-md ${on ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
            <span className="icon text-[18px]" aria-hidden="true">{icon}</span>{label}{dot && <span className="ml-auto h-2 w-2 rounded-full bg-secondary" aria-label="needs attention" />}</Link></li>;
        })}
      </ul>
    </nav>
  );
}
