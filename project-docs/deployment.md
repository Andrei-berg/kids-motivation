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
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Push Notifications (required for push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
VAPID_SUBJECT=mailto:admin@example.com

# Cron (optional, for production security)
CRON_SECRET=<random-secret>
```

`.env.local` is git-ignored. Set same vars in Vercel project settings.

## Vercel Deployment

1. Connect GitHub repo to Vercel
2. Set all environment variables in Vercel Dashboard → Settings → Environment Variables
3. Deploy: push to `main` → auto-deploys

## Database Migrations

Run in Supabase SQL Editor (project dashboard):
1. `supabase/schema-v3.sql` — current full schema
2. `supabase/rls.sql` — RLS policies
3. `supabase/seed-migration.sql` — seed data (development only)

Additional migration files in repo root:
- `supabase-schema-v2.sql` — legacy schema
- `supabase-migration-flexible.sql` — subjects/schedule
- `supabase-step3-expenses.sql` — expenses/sections

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
