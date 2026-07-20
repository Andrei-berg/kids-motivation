# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules

IMPORTANT: Preserve the original code and logic as much as possible. Only change what is necessary.

State your assumptions explicitly before writing code. If ambiguous, propose interpretations and ask.

IMPORTANT: All money mutations (wallet balance, transactions, rewards, purchases, exchanges, withdrawals, p2p) MUST run server-side with the service-role client. The money tables are RLS-locked to SELECT-only for clients — direct client writes are denied. See **Money / security model** below. Never reintroduce a client-side wallet write.

## Commands

```bash
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint (next lint) — exits 0; ~30 non-blocking warnings
npx tsc --noEmit   # Type check
npm test           # vitest run
```

### Applying DB migrations

DDL cannot go through the anon/service REST API. Apply SQL in `supabase/migrations/`
either via the Supabase SQL Editor, or — if `SUPABASE_DB_URL` (a Postgres connection
string, e.g. the Session pooler URI) is set in `.env.local` — via `pg`:

```bash
npm i pg --no-save
node --env-file=.env.local -e 'import("pg").then(async({default:pg})=>{const fs=await import("fs");const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await c.connect();await c.query(fs.readFileSync("supabase/migrations/FILE.sql","utf8"));console.log("applied");await c.end()})'
```

Verification scripts (run against the live DB with the service-role key):
`node --env-file=.env.local scripts/verify-wallet-rls.mjs` (RLS lock),
`verify-award-idempotency.mjs`, `verify-award-reads.mjs`.

## Architecture

**Next.js 14 App Router + Supabase (PostgreSQL, Auth, RLS) + Tailwind CSS + custom CSS**

A multi-family motivation system: any family registers, adds children, and the kids
earn coins for grades, room cleaning, sport, reading, and custom activities, then spend
them on parent-defined rewards. (The project began as a single-family app for two kids,
Adam & Alim — some legacy top-level pages from that era still exist; see Routing.)

### Auth & roles

- Supabase Auth. **Parents** sign in with email/password (`/` is the login/register page).
  A child may sign in with a real account (e.g. Google) **and/or** with a family code +
  4–6 digit PIN at `/kid/login` — the two are **additive, not exclusive**: setting a PIN
  never displaces a real account already linked to that child. `family_members.user_id`
  always names whichever identity is currently authoritative for that child (real account
  if they have one, otherwise a synthetic PIN-only account); PIN login resolves and signs
  in as *that* identity at login time rather than assuming a fixed synthetic address, so it
  keeps working even after the child later claims a real account via `/onboarding/join`
  (`claim_child_profile` — allowed whenever `has_real_account` is false, i.e. no real
  account yet, regardless of PIN status). Both paths ultimately resolve to a
  `family_members` row via `user_id`.
- **Child PIN login (password-less model).** A PIN-only child (no real account yet) gets
  a synthetic auth user `child_<childId>@internal.familycoins.app` whose password is a
  **long random secret** (never the PIN), so the public token endpoint has nothing to
  brute-force — do NOT reintroduce `signInWithPassword` with the PIN. The PIN is stored as
  a **bcrypt hash** in `child_pin_credentials` (RLS deny-all, service-role only) and
  verified by `verify_child_pin()`, which enforces an **authoritative per-child lockout**
  (5 fails / 15 min → 15 min lock). Flow: `/kid/login` → `getFamilyPinProfiles` picker
  (returns `child_id`) → POST `/api/kid/login` → verify PIN + lockout → look up the
  currently-linked identity's email (`admin.auth.admin.getUserById`) → mint a session with
  `generateLink`+`verifyOtp` (sets auth cookies). PINs are set by `/api/set-child-pin`
  (parent-guarded, service-role): stores the hash via `set_child_pin_hash`; only creates/
  links a synthetic account when the child has **no** account linked yet (`user_id IS
  NULL`) — otherwise leaves the existing link untouched and just flags `pin_set`.
  `/api/kid/login` is exempt from the middleware auth redirect (the caller is pre-auth by
  definition).
- `family_members` links an auth user to a family with a `role` (`parent` | `child` | `extended`)
  and, for children, a `child_id` → `children.id`.
- `middleware.ts` is the gatekeeper: redirects unauthenticated users to `/`, does role-based
  landing redirects, and guards `/parent/*` (parent only) and `/kid/*` (child only; a parent
  may inspect with `?preview=true`). Uses `getUser()` (re-validates JWT), not `getSession()`.

### Global state

`lib/store.ts` — Zustand with `persist` (key `v5_child`):

```ts
const { familyId, setFamilyId, activeMemberId, setActiveMemberId, language, setLanguage } = useAppStore()
// activeMemberId = family_members.id of the selected child
```

There is no global `childId`/`'adam'|'alim'` anymore. `children.id` is still `TEXT` but is a
per-family identifier, not a hardcoded literal.

### Routing

All pages are `'use client'`.

- `/` — auth (login/register). `/onboarding/*` — family setup / join.
- **Kid UI:** `/kid/login`, `/kid/day`, `/kid/wallet`, `/kid/shop`, `/kid/chat`,
  `/kid/achievements`, `/kid/leaderboard`.
- **Parent UI:** `/parent-center` (primary, mobile-first hub: dashboard, chat, wallets,
  analytics, settings, shop/reward management). `/parent/dashboard` is the desktop view;
  several `/parent/*` paths redirect into `/parent-center`.
- `/family/*` — shared, any authenticated member.
- **Legacy single-family pages still present:** `/dashboard`, `/wallet`, `/analytics`,
  `/wallboard`, `/expenses`, `/settings`, `/streaks`, `/records`, `/audit`, `/coach-rating`.
  Prefer the kid/parent-center equivalents for new work.

### lib/ — domain split

```
lib/models/        — types only
lib/repositories/  — Supabase queries (children, grades, wallet, expenses, schedule, audit, chat…)
lib/services/      — business logic (badges, streaks)
lib/supabase/      — clients: client.ts (browser), server.ts (cookie-session, RLS-bound),
                     middleware.ts (cookie sync), admin.ts (service-role + auth guards)
lib/*.ts           — backward-compat re-export wrappers (old import paths still work)
```

| File | Responsibility |
|---|---|
| `lib/supabase/admin.ts` | Service-role client + `requireParent`/`requireFamilyMember`/`assertChildInFamily` guards. **Use for all privileged money writes.** |
| `repositories/wallet.repo.ts` | Wallet/rewards/exchanges/withdrawals/transactions queries + `getWalletSettings` |
| `repositories/children.repo.ts`, `grades.repo.ts` | Days, subject grades |
| `repositories/expenses.repo.ts` | Expenses, sections (sports clubs), section visits (`section_visits`, incl. `coach_rating`) |
| `repositories/schedule.repo.ts` | Subjects, schedule, home exercises |
| `services/badges.service.ts`, `streaks.service.ts` | Achievements & streaks (run after a day is saved) |
| `api.ts` | `getWeekScore()` and aggregate reads |
| `utils/helpers.ts` | Date helpers — **use `localDateString()` for "today"**, never `toISOString().split('T')[0]` (that yields the UTC date, which is yesterday between 00:00–03:00 local UTC+3) |

### Money / security model

Money tables (`wallet`, `wallet_transactions`, `wallet_settings`, `rewards`,
`reward_purchases`, `coin_exchanges`, `cash_withdrawals`, `p2p_transfers`, `p2p_debts`)
are **RLS SELECT-only for clients** (migration `04.4-03`). Clients read directly but
cannot write. Every mutation goes through the server with the service-role client
(bypasses RLS) behind an auth guard:

- **API routes** `app/api/wallet/*`: `award` (recomputes a day's coin awards from saved
  rows — grades/room/behavior/sport/activities/book/streak — idempotent per
  `(child_id, source_type, source_id)`; client sends only `{childId, date}`),
  `purchase`, `exchange`, `withdraw`, `p2p`, `rewards` (parent CRUD), `settings` (parent).
  Shared helpers in `app/api/wallet/_lib.ts`.
- **Server actions** (`'use server'`): `app/parent/shop/actions.ts` (approve/reject + refund),
  `app/kid/shop/actions.ts` (requestPurchase), `app/actions/send-medal.ts`. All use
  service-role + guards.
- Client write wrappers: `lib/wallet-client.ts` (fetch → the routes above).

The kid/parent day-fill forms (`components/kid/KidDayFillForm.tsx`,
`components/DailyModal.tsx`) save the day's rows, then POST `/api/wallet/award` — they no
longer credit coins themselves. `coinsPreview` is only a client-side estimate for the flyup.

### Reward rules

Coin amounts are **per-family and configurable** in `wallet_settings` (edited via
`/api/wallet/settings`). Defaults live in `app/api/wallet/_lib.ts` (`SETTINGS_DEFAULTS`)
and `getWalletSettings`. Awards are computed server-side in `/api/wallet/award` from the
saved grades/day/section/activity/reading rows — do not hardcode coin values in components.

### Analytics

`app/analytics/page.tsx` reads raw data via `api.getWeekScore(childId, weekStart)` — no
finalization required; calculates coins directly from `days` + `subject_grades`.

### Cron / push

Vercel Cron (`vercel.json`): `/api/cron/missed-tasks` daily 20:00 UTC. Cron/push routes
authenticate via `assertCronAuth` (`lib/cron-auth.ts`) — **fails closed** if `CRON_SECRET`
is unset. Cron routes use the **service-role** client (a cookie client has no session in
cron context → RLS returns 0 rows). `/api/cron/reminders` exists but is **unscheduled**
(needs a `*/5` cron = Vercel Pro; feature parked). `notifyChild`/`notifyParent` are the
canonical push dispatchers.

### Styling

Pages mix Tailwind with custom classes in `app/globals.css` (legacy pages) and inline-style
design tokens in `components/kid/design/` and `components/parent-center/` (new UI). Do not
remove `globals.css` classes — legacy pages rely on them.

### Environment

```env
# Client (browser)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server (cookie-session client reads these WITHOUT the NEXT_PUBLIC_ prefix)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # required — money routes/actions throw without it
CRON_SECRET=                    # required in prod — cron/push fail closed without it
SUPABASE_DB_URL=                # optional — Postgres conn string for applying migrations
# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_MAILTO=
```

`.env.local` is git-ignored. The same vars (except `SUPABASE_DB_URL`) must be set in the
Vercel project for production (https://kids-motivation.vercel.app).

### Database

SQL lives in `supabase/migrations/` (and `supabase/schema-v3.sql`). Apply in order via the
Supabase SQL Editor or `pg` (see Commands). RLS is the security boundary — `rls.sql`
installs family-isolation policies; `04.4-03` locks money tables to SELECT-only. The legacy
root-level `supabase-*.sql` files are historical.

## Methodology

### Before Starting Any Task
Read DESIGN_DECISIONS.md and .planning/ROADMAP.md for architecture and phase context.

### Documentation Source of Truth
`project-docs/` — overview, requirements, architecture, tech stack, data model, API spec,
security, coding standards, testing, deployment. Update when making architectural changes.

### GSD — Execution Tool
`.planning/` directory with ROADMAP.md, STATE.md, phase plans.
- `/gsd:plan-phase N.M` — plan next phase
- `/gsd:execute-phase` — execute plans
- `/gsd:progress` — check current state
