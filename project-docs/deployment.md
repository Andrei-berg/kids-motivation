# Deployment

## Environments

| Environment | URL | Branch |
|---|---|---|
| Production | https://kids-motivation.vercel.app | `main` |
| Preview | Auto-generated per PR | any branch |
| Local | http://localhost:3000 | local |

## Local Development

```bash
npm install
cp .env.local.example .env.local   # fill in env vars
npm run dev                         # http://localhost:3000
```

## Required Environment Variables

```env
# Supabase — client (browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
# Supabase — server (cookie-session client reads these WITHOUT NEXT_PUBLIC_)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
# REQUIRED — server-side money routes/actions throw without it
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# REQUIRED in prod — cron/push fail closed (500) without it; Vercel Cron auto-sends it as a bearer
CRON_SECRET=<random-secret>

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
VAPID_MAILTO=mailto:admin@example.com

# Optional — Postgres connection string (Session pooler) for applying migrations via pg
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:5432/postgres
```

`.env.local` is git-ignored. Set the same vars (except `SUPABASE_DB_URL`) in
Vercel project settings.

> ⚠️ **Deploy gotcha:** `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` must be set
> in Vercel. Without the service-role key the entire wallet/money layer fails;
> without `CRON_SECRET` the cron + push routes return 500 (they fail closed).
> The server client uses the non-`NEXT_PUBLIC_` `SUPABASE_URL`/`SUPABASE_ANON_KEY`.

## Vercel Deployment

1. Connect GitHub repo to Vercel
2. Set all environment variables in Vercel Dashboard → Settings → Environment Variables
3. Deploy: push to `main` → auto-deploys

## Database Migrations

Apply SQL in `supabase/migrations/` — either in the Supabase SQL Editor, or via
`pg` if `SUPABASE_DB_URL` is set (DDL cannot go through the REST/anon API):

```bash
npm i pg --no-save
node --env-file=.env.local -e 'import("pg").then(async({default:pg})=>{const fs=await import("fs");const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await c.connect();await c.query(fs.readFileSync("supabase/migrations/FILE.sql","utf8"));console.log("applied");await c.end()})'
```

Baseline: `supabase/schema-v3.sql` → `supabase/migrations/rls.sql` → seed.

Security migrations (2026-06-15 — already applied to prod):
- `04.4-02-wallet-tx-idempotency.sql` — `source_type`/`source_id` + unique index
- `04.4-03-wallet-rls-readonly.sql` — money tables → SELECT-only for clients
- `04.4-04-drop-anon-policies.sql` — drop 23 `*_anon_all` policies
- `04.4-05-close-public-true-policies.sql` — replace 7 `public USING true` policies with family-isolation
- `04.4-06-expense-section-link.sql` — `expenses.section_id` + `period` + partial unique (section monthly cost → per-month expense rows)

Verification scripts (run against live DB with the service-role key):
`scripts/verify-wallet-rls.mjs`, `verify-award-idempotency.mjs`, `verify-award-reads.mjs`.

Legacy migration files in repo root (`supabase-schema-v2.sql`,
`supabase-migration-flexible.sql`, `supabase-step3-expenses.sql`) are historical.

## Build Commands

```bash
npm run build      # Production build (must pass before deploy)
npm run lint       # ESLint (fix issues before commit)
npx tsc --noEmit   # TypeScript check
```

## PWA Notes

- `public/manifest.json` — PWA manifest
- `public/sw.js` — Service Worker
- Install prompt: Safari "Add to Home Screen" on iOS, Chrome on Android

## Google OAuth Setup (one-time)

1. Google Cloud Console → Create OAuth 2.0 credentials
2. Authorized redirect URIs: `https://<supabase-project>.supabase.co/auth/v1/callback`
3. Add Client ID + Secret to Supabase Dashboard → Auth → Providers → Google
