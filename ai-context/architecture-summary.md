# Architecture Summary

## Tech Stack
Next.js 14 App Router + Supabase (PostgreSQL + Auth + Realtime) + Tailwind + Zustand

## Key Routes
`/dashboard` `/wallet` `/analytics` `/wallboard` `/expenses` `/settings` `/audit`
All pages: `'use client'`. NavBar inside each page (not layout).
Redirects: `/` → `/dashboard`. `/weekly` and `/potential/[id]` deleted.

## Global State (lib/store.ts)
```ts
const { activeMemberId, familyId, setActiveMemberId } = useAppStore()
// activeMemberId = UUID from family_members.id
// familyId = UUID from families.id
```

## lib/ Structure
```
lib/models/         — types (child, wallet, category, family)
lib/repositories/   — DB queries (children, grades, wallet, categories, schedule, expenses)
lib/services/       — business logic (coins, badges, streaks, onboarding, push)
lib/*.ts            — backward compat re-export wrappers
lib/supabase/       — client.ts (browser), server.ts (SSR)
lib/supabase.ts     — legacy browser client
```

## Data Flow (DailyModal)
```
User fills form →
  Promise.all([saveDay, saveGrades, saveExercises, saveSections]) →
  updateStreaks(childId, date) →
  checkAndAwardBadges(childId, date)
```

## Multi-Tenant Pattern
- All new DB tables have `family_id UUID`
- RLS via `get_my_family_ids()` helper (SECURITY DEFINER)
- API functions accept `familyId` as explicit param (not from global store)
- `activeMemberId` = `family_members.id` (UUID), used everywhere in new code

## Supabase Clients
- New code: `createClient()` from `lib/supabase/client.ts` (@supabase/ssr)
- Legacy code: `supabase` from `lib/supabase.ts`
- Server: `createClient()` from `lib/supabase/server.ts`
