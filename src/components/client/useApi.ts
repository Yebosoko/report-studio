"use client";
/* fetch wrapper for the app's JSON API: throws Error(message) with the server's plain-language error. */
export async function api<T = any>(url: string, opts: { method?: string; json?: any; form?: FormData; signal?: AbortSignal } = {}): Promise<T> {
  const r = await fetch(url, { method: opts.method || (opts.json || opts.form ? "POST" : "GET"), headers: opts.json ? { "Content-Type": "application/json" } : undefined,
    body: opts.json ? JSON.stringify(opts.json) : opts.form, signal: opts.signal });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("json") ? await r.json().catch(() => ({})) : {};
  if (!r.ok) throw new Error((data as any).error || (r.status === 401 ? "Your session has ended. Sign in again." : `Request failed (${r.status}).`));
  return data as T;
}
