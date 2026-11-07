/* Row level security tests on a real Postgres (PGlite), with a stand-in for Supabase's auth and storage schemas.
   Run: npm run test:rls */
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const OWNER = "00000000-0000-0000-0000-000000000001", ALICE = "00000000-0000-0000-0000-00000000000a", BOB = "00000000-0000-0000-0000-00000000000b";
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
`);
await db.exec(fs.readFileSync(new URL("../../supabase/migrations/0001_init.sql", import.meta.url), "utf8"));
await db.exec(fs.readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8"));
await db.exec(`
  grant usage on schema public, auth, storage to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  grant usage, select on all sequences in schema public to authenticated;
  insert into auth.users (id, email) values ('${OWNER}', 'owner@example.com'), ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com');
  update public.profiles set role = 'owner' where id = '${OWNER}';
  insert into public.library_versions (version_no, status, library, note) values (2, 'draft', '{"draft":true}', 'pending');
  insert into public.samples (name) values ('AfDB review'); insert into public.lab_threads (id) values ('main');
`);

let pass = 0, fail = 0;
const as = async (who, sql) => {
  await db.exec("reset role");
  if (who === "anon") { await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false)"); }
  else { await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${who}', false)`); }
  try { return {rows: (await db.query(sql)).rows}; } catch (e) { return {error: e.message}; } finally { await db.exec("reset role"); }
};
const check = (name, cond) => { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } };

let r = await as(ALICE, `insert into public.reports (title, body) values ('Alice ESIA', '{}') returning id, user_id`);
check("member creates own report", r.rows && r.rows[0].user_id === ALICE);
await as(BOB, `insert into public.reports (title, body) values ('Bob RAP', '{}')`);
r = await as(ALICE, `select title from public.reports`);
check("member sees only own reports", r.rows && r.rows.length === 1 && r.rows[0].title === "Alice ESIA");
r = await as(OWNER, `select title from public.reports`);
check("owner cannot read members' reports", r.rows && r.rows.length === 0);
r = await as(ALICE, `insert into public.reports (user_id, title, body) values ('${BOB}', 'forged', '{}')`);
check("member cannot create a report for someone else", !!r.error);
r = await as(ALICE, `update public.reports set title = 'hijack' where title = 'Bob RAP' returning id`);
check("member cannot edit another's report", r.rows && r.rows.length === 0);

r = await as(ALICE, `select status from public.library_versions`);
check("member reads only the published library", r.rows && r.rows.length === 1 && r.rows[0].status === "published");
r = await as("anon", `select status from public.library_versions`);
check("visitors read the published library", r.rows && r.rows.length === 1);
r = await as(OWNER, `select status from public.library_versions order by version_no`);
check("owner reads draft and published", r.rows && r.rows.length === 2);
r = await as(ALICE, `update public.library_versions set note = 'x' returning id`);
check("member cannot change the library", r.rows && r.rows.length === 0);

for (const t of ["samples", "lab_threads", "app_settings", "change_sets", "audit_log", "ai_usage"]) {
  r = await as(ALICE, `select * from public.${t}`);
  check(`member sees nothing in ${t}`, r.rows && r.rows.length === 0);
}
r = await as(OWNER, `select * from public.samples`);
check("owner reads samples", r.rows && r.rows.length === 1);
r = await as(ALICE, `insert into public.samples (name) values ('x')`);
check("member cannot add samples", !!r.error);

r = await as(ALICE, `update public.profiles set role = 'owner' where id = '${ALICE}'`);
check("member cannot make themselves owner", !!r.error);
r = await as(ALICE, `update public.profiles set plan_id = 'firm' where id = '${ALICE}'`);
check("member cannot change their own plan", !!r.error);
r = await as(ALICE, `update public.profiles set name = 'Alice A.' where id = '${ALICE}' returning name`);
check("member can edit their own name", r.rows && r.rows[0] && r.rows[0].name === "Alice A.");
r = await as(ALICE, `select email from public.profiles`);
check("member sees only own profile", r.rows && r.rows.length === 1);
r = await as(OWNER, `update public.profiles set plan_id = 'professional' where id = '${ALICE}' returning plan_id`);
check("owner can change a member's plan", r.rows && r.rows[0] && r.rows[0].plan_id === "professional");
r = await as("anon", `select id from public.plans`);
check("visitors read plans", r.rows && r.rows.length === 3);

r = await as(ALICE, `insert into storage.objects (bucket_id, name) values ('report-images', '${ALICE}/r1/photo.jpg') returning id`);
check("member uploads into own folder", r.rows && r.rows.length === 1);
r = await as(ALICE, `insert into storage.objects (bucket_id, name) values ('report-images', '${BOB}/r1/photo.jpg')`);
check("member cannot upload into another's folder", !!r.error);
r = await as(BOB, `select name from storage.objects`);
check("member cannot list another's files", r.rows && r.rows.length === 0);
r = await as(ALICE, `insert into storage.objects (bucket_id, name) values ('samples', 'x/page1.jpg')`);
check("member cannot upload samples", !!r.error);
r = await as(OWNER, `insert into storage.objects (bucket_id, name) values ('samples', 's1/page1.jpg') returning id`);
check("owner uploads samples", r.rows && r.rows.length === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
