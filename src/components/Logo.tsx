import Link from "next/link";
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2 focus-visible:outline-none">
      <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-on-primary"><span className="icon text-[16px]" aria-hidden="true">article</span></span>
      <span className="font-serif text-headline-sm tracking-tight text-on-surface group-hover:text-primary">Report Studio</span>
    </Link>
  );
}
