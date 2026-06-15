# Coding Standards

## Must-Follow Rules

### Global State
- Use `useAppStore()` from `lib/store.ts` for `activeMemberId`, `familyId`
- **Never** read `localStorage` directly for child/family IDs
- **Never** use hardcoded `'adam'` or `'alim'` — zero tolerance in TypeScript files

### Supabase Clients
- New multi-tenant code: use `createClient()` from `lib/supabase/client.ts`
- Legacy pages not yet migrated: use `supabase` from `lib/supabase.ts`
- Server components / Server Actions: use `createClient()` from `lib/supabase/server.ts`

### API Calls
- All new API functions accept `familyId` as explicit parameter
- Use `activeMemberId` (UUID from `family_members.id`), not legacy `childId` TEXT
- No global singletons — caller controls scope

### Money mutations (server-side only)
- **Never** write money tables from the client — RLS denies it. Money tables:
  `wallet`, `wallet_transactions`, `wallet_settings`, `rewards`,
  `reward_purchases`, `coin_exchanges`, `cash_withdrawals`, `p2p_transfers`.
- Mutate via the `/api/wallet/*` routes (or `lib/wallet-client.ts` helpers) and
  server actions, which use the service-role client + `requireParent` /
  `requireFamilyMember` guards from `lib/supabase/admin.ts`.
- Coin amounts come from `wallet_settings` (server-side); never hardcode them.

### Dates
- Use `localDateString(date?)` from `utils/helpers.ts` for "today" / calendar
  dates (family TZ = UTC+3). **Never** `new Date().toISOString().split('T')[0]`
  (that returns the UTC date → wrong day late evening / early morning).

### File Organization (lib/)
```
lib/models/       — types only, no logic
lib/repositories/ — Supabase queries only
lib/services/     — business logic only
lib/             — backward compat re-export wrappers
```

### React Components
- All pages are `'use client'`
- NavBar rendered inside each page (not in layout)
- No `window.location.reload()` in NavBar — use Zustand state

### Async
- Always `await` Supabase calls
- Use `Promise.all()` for independent parallel operations
- DailyModal save pattern: `await Promise.all([...])` then badges/streaks

### TypeScript
- No `any` in new code
- Prefer `interface` for object shapes, `type` for unions
- Always type function return values

## Forbidden Patterns

```ts
// ❌ Never
localStorage.getItem('v4_selected_kid')
localStorage.getItem('v5_child')
const childId = 'adam'
import { supabase } from '@/lib/supabase'  // in new files
new Date().toISOString().split('T')[0]      // UTC date — use localDateString()
supabase.from('wallet').update(...)         // client money write — use /api/wallet/*

// ✅ Always
const { activeMemberId, familyId } = useAppStore()
const supabase = createClient()  // from lib/supabase/client.ts
localDateString()                // from utils/helpers
await fetch('/api/wallet/award', { method: 'POST', ... })  // money mutation
```

## Styling Rules

- Mix Tailwind with custom classes from `app/globals.css`
- Key custom classes: `premium-*`, `dashboard-hero`, `day-status-grid`, `week-calendar`, `scroll-modal`
- **Never remove** classes from globals.css — all are used
- Mobile-first: test at 375px

## Commit Style

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- One concern per commit
- Build must pass before committing
