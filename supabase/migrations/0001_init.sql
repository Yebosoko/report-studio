-- Report Studio: initial schema, row level security and storage.
-- Run in the Supabase SQL editor (or `supabase db push`). Then run supabase/seed.sql.


do $$ begin create type public.user_role as enum ('owner', 'member'); exception when duplicate_object then null; end $$;

-- ---------- Plans ----------
create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_ngn integer not null default 0,
  price_usd numeric(10, 2) not null default 0,
  report_limit integer,            -- reports per calendar month; null = unlimited
  template_limit integer,          -- first N templates of the library; null = all
  ai_enabled boolean not null default false,  -- members on this plan may use "Structure with AI" / "Refine with AI"
  features text[] not null default '{}',
  sort integer not null default 0,
  active boolean not null default true
);

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  organisation text not null default '',
  job_role text not null default '',
  role public.user_role not null default 'member',
  plan_id text references public.plans (id) default 'starter',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

-- True when the signed-in user is the active owner. Security definer so policies can call it without recursion.
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner' and status = 'active');
$$;

-- New sign-ups get a member profile. The owner role is granted by the server (OWNER_EMAIL), never by this trigger.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, organisation, job_role)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''),
          coalesce(new.raw_user_meta_data ->> 'organisation', ''), coalesce(new.raw_user_meta_data ->> 'job_role', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Members may edit their own name/organisation, but never their role, plan or status.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_owner() then
    if new.role is distinct from old.role or new.plan_id is distinct from old.plan_id
       or new.status is distinct from old.status or new.email is distinct from old.email or new.id is distinct from old.id then
      raise exception 'Only the owner can change role, plan, status or email';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles for each row execute function public.guard_profile_update();

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  template_id text not null default '',
  doc_type text not null default '',
  theme text not null default '',
  cover text not null default '',
  font text not null default '',
  client text not null default '',
  body jsonb not null,
  draft_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_user_updated on public.reports (user_id, updated_at desc);

-- ---------- Brand kits ----------
create table if not exists public.brand_kits (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  prepared_by text not null default '',
  logo jsonb,                       -- {path, w, h} in the brand-logos bucket
  default_theme text,
  default_font text,
  contact_email text not null default '',
  contact_phone text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- Template library (versioned) ----------
create table if not exists public.library_versions (
  id uuid primary key default gen_random_uuid(),
  version_no integer not null,
  status text not null check (status in ('draft', 'published', 'retired')),
  library jsonb not null,
  note text not null default '',
  created_by text not null default 'owner',   -- 'owner' | 'claude' | 'seed'
  kind text not null default 'change',        -- 'change' | 'rollback' | 'seed'
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index if not exists one_published_library on public.library_versions ((status)) where status = 'published';
create unique index if not exists one_draft_library on public.library_versions ((status)) where status = 'draft';

-- ---------- Owner-only tables ----------
create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organisation text not null default '',
  notes text not null default '',
  kind text not null default 'PDF',
  page_count integer,
  pages jsonb not null default '[]',      -- [{path, w, h, page}] in the samples bucket
  text_excerpt text not null default '',
  study jsonb,
  study_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.lab_threads (
  id text primary key default 'main',
  turns jsonb not null default '[]',      -- what the owner sees in the Studio Lab conversation
  pending jsonb,                          -- raw messages of an unfinished task, so "Continue" resumes it
  updated_at timestamptz not null default now()
);
create table if not exists public.change_sets (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'library' check (kind in ('library', 'code')),
  status text not null default 'pending' check (status in ('pending', 'applied', 'discarded', 'rolled_back')),
  summary text not null default '',
  steps jsonb not null default '[]',
  checks jsonb,
  library_version_id uuid references public.library_versions (id) on delete set null,
  pr_url text, preview_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id text primary key default 'main',
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  target text not null default '',
  detail jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  feature text not null,                   -- 'lab' | 'sample_study' | 'member_structure' | 'member_refine'
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created on public.ai_usage (created_at);
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  type text not null,                      -- 'export_docx' | 'report_created' ...
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_created on public.events (created_at);

-- ---------- Row level security ----------
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.brand_kits enable row level security;
alter table public.library_versions enable row level security;
alter table public.samples enable row level security;
alter table public.lab_threads enable row level security;
alter table public.change_sets enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.ai_usage enable row level security;
alter table public.events enable row level security;

drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select to anon, authenticated using (active or public.is_owner());
drop policy if exists plans_owner on public.plans;
create policy plans_owner on public.plans for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_owner());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_owner()) with check (id = auth.uid() or public.is_owner());

-- Reports and brand kits: only their author. The owner has no special access to members' work.
drop policy if exists reports_own on public.reports;
create policy reports_own on public.reports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists brand_own on public.brand_kits;
create policy brand_own on public.brand_kits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Everyone reads the published library; only the owner sees drafts and history, and changes them.
drop policy if exists library_read_published on public.library_versions;
create policy library_read_published on public.library_versions for select to anon, authenticated using (status = 'published' or public.is_owner());
drop policy if exists library_owner on public.library_versions;
create policy library_owner on public.library_versions for all to authenticated using (public.is_owner()) with check (public.is_owner());

do $$ declare t text; begin
  foreach t in array array['samples', 'lab_threads', 'change_sets', 'app_settings', 'audit_log'] loop
    execute format('drop policy if exists %1$s_owner on public.%1$s', t);
    execute format('create policy %1$s_owner on public.%1$s for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;

drop policy if exists ai_usage_owner_read on public.ai_usage;
create policy ai_usage_owner_read on public.ai_usage for select to authenticated using (public.is_owner());
drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists events_owner_read on public.events;
create policy events_owner_read on public.events for select to authenticated using (public.is_owner());

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values
  ('report-images', 'report-images', false), ('brand-logos', 'brand-logos', false), ('samples', 'samples', false)
on conflict (id) do nothing;

-- report-images and brand-logos: each user's files live under a folder named with their user id.
drop policy if exists user_files_rw on storage.objects;
create policy user_files_rw on storage.objects for all to authenticated
  using (bucket_id in ('report-images', 'brand-logos') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('report-images', 'brand-logos') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists samples_owner on storage.objects;
create policy samples_owner on storage.objects for all to authenticated
  using (bucket_id = 'samples' and public.is_owner()) with check (bucket_id = 'samples' and public.is_owner());
