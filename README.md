# Report Studio

Designed, editable Word reports for environmental and social safeguards work. Members pick a template, paste a draft, edit designed sections on the page and download a .docx. The owner gets an admin area where Claude improves the template library, with every change reviewed before members see it.

Built from the Stitch designs (DESIGN.md "Institutional Safeguards Desk") and the Part 2 build spec. Architecture and extension rules: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## What's in this round
- Public site: landing, pricing, sign in / create account (email + optional Google), password reset, privacy and terms drafts.
- Member workspace: dashboard with plan usage, template library and detail, the report editor (in-place editing, block toolbar, charts, rating colours, Word/PDF/text import, autosave), Word export dialog, brand kit, account (profile, password, plan, data export, account deletion).
- Owner admin (`/admin`, 404 for everyone else): overview, Studio Lab (Claude tool loop on a draft library), samples with page picker and Claude design study, templates & covers builder, change review / apply / discard, version history with rollback, users & plans (per-plan member-AI switch), AI settings (models, budget cap, prices, usage, writing rules).
- Member AI ("Structure with AI", "Refine with AI"): off by default; on per plan.

**Next round:** Paystack payments and invoices; Studio Lab code lane (Claude opens GitHub pull requests with Vercel previews and checks).

## Set up (about 20 minutes)

### 1. Supabase
1. Create a project at supabase.com (choose a region near your users, e.g. EU West).
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`. This creates the tables, security rules, storage buckets, the three plans and library version 1.
3. **Authentication → URL Configuration**: Site URL = your site address (e.g. `https://report-studio.vercel.app`); add `https://YOUR-SITE/auth/callback` to Redirect URLs.
4. Optional: **Authentication → Providers → Google** to enable "Continue with Google", then set `ENABLE_GOOGLE_SIGNIN=1`.
5. **Project Settings → API**: copy the URL, the `anon` key and the `service_role` key.

### 2. Vercel
1. **Add New → Project**, import the GitHub repository `report-studio`. Framework: Next.js (detected).
2. Add the environment variables from `.env.example` (`OWNER_EMAIL`, the three Supabase values, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`).
3. Deploy. Then sign up on the live site with the `OWNER_EMAIL` address: that account becomes the owner (Firm plan, admin area).

### 3. First steps as owner
- **Admin → AI settings**: check the models, enter Anthropic's current prices per million tokens (cost shows once these are filled in), set the monthly budget.
- **Admin → Users & plans → Plans**: adjust prices and limits; switch member AI on for a plan only when you want members to use your Claude budget.

## Develop and test locally
```
npm install
cp .env.example .env.local      # fill in, or leave Supabase empty for local mode
npm run dev
```
Without Supabase variables the app runs in **local mode**: data in `.data/`, sign-up works offline, password-reset links print in the terminal. Local mode refuses to run in production unless `ALLOW_LOCAL_MODE=1`.

Checks:
```
npm run typecheck     # TypeScript
npm test              # engine: library valid, every template builds a Word file
npm run test:rls      # 28 database security tests (members can't read each other's data; admin tables owner-only)
# end-to-end walk-through (local mode, scripted AI):
OWNER_EMAIL=owner@example.com SESSION_SECRET=x ALLOW_LOCAL_MODE=1 AI_MOCK=1 npm run build && \
OWNER_EMAIL=owner@example.com SESSION_SECRET=x ALLOW_LOCAL_MODE=1 AI_MOCK=1 npx next start -p 3100 &
BASE=http://localhost:3100 node tests/e2e/run.mjs
```

## Security model (short)
- Owner = `OWNER_EMAIL`, granted by server code at sign-in. Three locks on the admin area: middleware 404, a role check in every admin page and route, and Postgres row level security.
- Reports, images and brand kits are visible only to their author (tested in `tests/rls`). Files are served through `/api/files`, which checks the folder and reads with the user's own credentials.
- API keys live only in server environment variables; prompts are built on the server; sample and report text is treated as data, never instructions.
- Every AI call is logged with tokens and cost; requests stop at the monthly cap; Studio Lab requests are limited to 40 tool steps. Studio Lab requests, tool calls, applies, rollbacks and plan/user changes go to the audit log.
