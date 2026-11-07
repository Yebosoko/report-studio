import Link from "next/link";
export default function NotFound() {
  return (<main className="gutter grid min-h-screen place-items-center bg-desk py-10"><div className="card w-full max-w-md p-8 text-center">
    <p className="micro">404</p><h1 className="mt-2 font-serif text-headline-sm">Page not found</h1>
    <p className="mt-2 text-body-md text-on-surface-variant">The page you were looking for doesn't exist or has moved.</p>
    <Link href="/" className="btn mt-6">Go to the home page</Link></div></main>);
}
