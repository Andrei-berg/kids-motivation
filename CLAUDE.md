# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check (no test suite exists)
```

## Architecture

**Next.js 14 App Router + Supabase (PostgreSQL) + Tailwind CSS + custom CSS**

Family motivation system for two children (Adam, Alim). Children earn coins for grades, room cleaning, and sport.

### Global state

`lib/store.ts` — Zustand v4 store with `persist` middleware. All pages read `childId` from here:

```ts
const { childId, setChildId } = useAppStore() // 'adam' | 'alim'
```

**Never** use `localStorage.getItem('v4_selected_kid')` or page-local `childId` state — all pages use the store.

### Routing

`app/page.tsx` → redirects to `/dashboard`. Key routes: `/dashboard`, `/wallet`, `/analytics`, `/wallboard`, `/expenses`, `/settings`, `/audit` (hidden, parent-only). Pages `/weekly` and `/potential/[childId]` are deleted — redirect to `/dashboard`.

All pages are `'use client'`. NavBar is rendered inside each page, not in the layout.

### lib/ — domain split

| File | Responsibility |
|---|---|
| `api.ts` | Children, days, subject grades, home sport, goals, streaks, weekly data, `getWeekScore()` |
| `wallet-api.ts` | Wallet balance, transactions, exchange, shop rewards, P2P transfers, withdrawals |
| `flexible-api.ts` | Subjects, schedule, home exercises, exercise types |
| `expenses-api.ts` | Expenses, sections (sports clubs), section visits |
| `badges.ts` | Badge/achievement system, called after day save |
| `streaks.ts` | Streak calculation, called after day save |
| `store.ts` | Zustand global store for `childId` |
| `supabase.ts` | Supabase client (throws on missing env vars) |

### DailyModal

`components/DailyModal.tsx` — single-scroll form (no tabs). Sections: Учёба → Комната → День → Спорт → Секции. Save is a single batched `Promise.all`:

```ts
await Promise.all([saveDay, saveGrades, saveExercises, saveSections])
await updateStreaks(childId, date)
await checkAndAwardBadges(childId, date)
```

### Analytics

`app/analytics/page.tsx` reads raw data via `api.getWeekScore()` — **no finalization required**. Works for current week.

`api.getWeekScore(childId, weekStart)` calculates coins directly from `days` + `subject_grades` tables.

### Reward rules (hardcoded in `lib/api.ts` and `lib/wallet-api.ts`)

- Grades: 5→+5💰, 4→+3💰, 3→-3💰, 2→-5💰, 1→-10💰
- Room (≥3/5 items): +3💰 per day
- Good behavior: +5💰 per day
- Sport coach rating: 5→+10💰, 4→+5💰, 3→0, 2→-3💰, 1→-10💰

### Styling

Pages mix Tailwind with custom classes in `app/globals.css`. Key custom classes: `premium-*` (modal, tabs, checklist, grade buttons), `dashboard-hero`, `day-status-grid`, `week-calendar`, `scroll-modal`, `scroll-section-*`. Do not remove any globals.css classes — all are used.

### Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`.env.local` is git-ignored. Same vars needed in Vercel project settings for production (https://kids-motivation.vercel.app).

### Database

SQL migration files in repo root: `supabase-schema-v2.sql` (main schema), `supabase-migration-flexible.sql` (subjects/schedule), `supabase-step3-expenses.sql` (expenses/sections). Run in Supabase SQL Editor to apply.

Children have `id TEXT PRIMARY KEY` — values are `'adam'` and `'alim'`.
