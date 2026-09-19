# System Architecture

> Principle: start with what we know (Next.js + Supabase), add what's needed. No over-engineering.

## Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT                               │
│  Next.js 14 App Router (PWA)                           │
│  React + TypeScript + Tailwind CSS                     │
│  Zustand (global state)                                │
│  Framer Motion (animations)                            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                    BACKEND                              │
│  Supabase                                               │
│  ├── PostgreSQL (database)                             │
│  ├── Auth (email / Google / Apple)                     │
│  ├── Realtime (chat, notifications)                    │
│  ├── Storage (avatars, photos)                         │
│  └── Edge Functions (business logic, webhooks)         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    SERVICES                             │
│  Stripe (subscriptions and payments)                   │
│  Resend (email notifications)                          │
│  Expo (push notifications for native)                  │
│  Vercel (deployment)                                   │
└─────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

### Isolation Principle
Every family is a `family`. All data is bound to `family_id`. Row Level Security (RLS) in Supabase guarantees that family A never sees family B's data.

```sql
-- Example RLS policy
CREATE POLICY "Family members only" ON days
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );
```

### Data Hierarchy
```
auth.users (Supabase Auth)
    └── user_profiles (name, avatar, timezone, onboarding_step)
            └── family_members (role: parent|child|extended)
                    └── families (name, invite_code, created_by)
                            ├── categories (configurable activity categories)
                            ├── tasks (within categories)
                            ├── schedule_items (weekly schedule per child)
                            ├── days (daily entries)
                            ├── subject_grades (grades per subject)
                            ├── wallets (balance)
                            ├── wallet_transactions (history)
                            ├── rewards / shop items
                            ├── reward_purchases
                            ├── badges
                            ├── streaks
                            ├── push_subscriptions
                            └── messages (chat, v3+)
```

## Code Architecture (lib/)

```
lib/
├── models/                    # TypeScript types only
│   ├── child.types.ts         # Child, DayData, Grade, Sport, Goal types
│   ├── wallet.types.ts        # Wallet, Transaction, Reward, Shop types
│   ├── category.types.ts      # Category, Task, ScheduleItem, Subject types
│   ├── family.types.ts        # Family, Member, UserProfile, Push types
│   └── index.ts               # Re-exports
├── repositories/              # Supabase queries only
│   ├── children.repo.ts       # Days, sport, sections, goals CRUD
│   ├── grades.repo.ts         # Subject grades CRUD
│   ├── wallet.repo.ts         # Wallet balance, transactions, rewards
│   ├── categories.repo.ts     # Categories + tasks CRUD
│   ├── schedule.repo.ts       # Schedule items + legacy subjects/exercises
│   └── expenses.repo.ts       # Expenses + sections CRUD
├── services/                  # Business logic only
│   ├── coins.service.ts       # Coin calculation: getWeekScore
│   ├── badges.service.ts      # Badge award logic
│   ├── streaks.service.ts     # Streak calculation
│   ├── onboarding.service.ts  # Onboarding flow operations
│   └── push.service.ts        # Push subscription management
├── hooks/                     # React hooks
├── supabase/                  # Supabase client factories
│   ├── client.ts              # Browser client (@supabase/ssr)
│   ├── server.ts              # Server client — cookie session, RLS-bound (uses SUPABASE_URL / SUPABASE_ANON_KEY, no NEXT_PUBLIC_ prefix)
│   ├── middleware.ts          # Cookie-sync client for middleware
│   └── admin.ts               # Service-role client (bypasses RLS) + requireParent / requireFamilyMember / assertChildInFamily guards — server-only
├── cron-auth.ts               # assertCronAuth() — fail-closed CRON_SECRET check
├── wallet-client.ts           # Client fetch wrappers for parent money write routes
├── store.ts                   # Zustand global store (familyId, activeMemberId, language)
└── supabase.ts                # Legacy browser client (backward compat)
```

## Server-side write layer (money / privileged ops)

Money tables are RLS **SELECT-only** for clients; all mutations run server-side
with the service-role client behind an auth guard (see security-model.md).

```
app/api/
├── wallet/
│   ├── _lib.ts                # shared: loadWallet, insertTx, creditAwards (idempotent), processPurchase, authorizeChildAction
│   ├── award/route.ts         # recompute a day's coin awards from saved rows (idempotent per source)
│   ├── purchase/route.ts      # buy reward
│   ├── exchange|withdraw|p2p/route.ts
│   ├── rewards/route.ts       # parent reward CRUD (POST/PATCH/DELETE)
│   └── settings/route.ts      # parent wallet_settings update (PATCH)
├── cron/{reminders,missed-tasks}/route.ts   # service-role; assertCronAuth
├── push/send/route.ts         # assertCronAuth
├── set-child-pin/route.ts     # parent-guarded PIN setup (service-role admin user)
└── delete-account/route.ts    # parent-guarded cascade (service-role)
```

Server actions (`'use server'`) also use the service-role admin client:
`app/parent/shop/actions.ts`, `app/kid/shop/actions.ts`, `app/actions/send-medal.ts`.

## Kid Day-fill Render Layer

The `/kid/day` screen (`app/kid/(app)/day/page.tsx`) selects its render layer from the
child's `children.fill_style` column, passed straight through to `KidDayFillForm`'s
`fillStyle` prop and defaulting to `'sticky-summary'` when unset:

```typescript
// app/kid/(app)/day/page.tsx
<KidDayFillForm ... fillStyle={child?.fill_style ?? 'sticky-summary'} />
```

All three styles ship as of Phase 9.4: `sticky-summary` (Phase 9.3's default),
`tile-sheet`, and `story-stepper`. All three are **render-only** layers over
`KidDayFillForm`'s existing state, validation, save, and award logic — every
`useState` hook and the `sectionCoins`/`coinsPreview`/`handleSubmit` pipeline are
unchanged across all three; only the JSX render tree differs per style. The pinned
Save button and the single `/api/wallet/award` call are shared and unchanged by
every style.

Shared building blocks live in `components/kid/day-fill/`:
- `StickySummaryBar` — the persistent completion-ring + live-total header, reused
  as-is by both `sticky-summary` and `tile-sheet`.
- `QuickRow` — a one-tap binary row, `InlinePanelRow` — an independently-expandable
  in-place panel (both `sticky-summary`-specific).
- `TileGrid` + `TileCard` + `BottomSheet` (Phase 9.4) — the `tile-sheet` style: a
  2-column grid whose tiles (one per category, per extra activity, and per custom
  day-block) each open one shared bottom sheet scoped to that single category.
- `StoryStepper` + `DotTrack` + `StepCoinHeader` (Phase 9.4) — the `story-stepper`
  style: one category per full-screen step behind a tappable dot track, with
  auto-advance on single-answer steps, an explicit skip control, and a final
  summary screen that carries the shared Save button.

The pure completion-ring/coin-delta maths is factored out into
`lib/kid/day-fill-progress.ts` (`computeFillProgress`, `diffSectionCoins`),
unit-tested with zero React/component imports, and reused unchanged by all three
styles.

Live per-row coin feedback reuses the single existing `components/kid/CoinAnimation.tsx`
mechanism (`useCoinAnimation`/`CoinFlyup`) — extended with row-anchored positioning and
a distinct downward "loss" variant for negative deltas — rather than a parallel
animation system. All three styles anchor this same mechanism via one shared
`onPointerDownCapture` handler and `data-fill-row` markers inside each style's body/
sheet/step content, so a flyup always anchors at the actual tap point regardless of
which style is active. This feedback is **preview-only**: it is driven off the
already-computed `sectionCoins` breakdown and never itself credits coins.
`/api/wallet/award` remains the sole authoritative crediting path, called once at save
exactly as before.

## Backward-Compat Wrappers
Old import paths still work — files re-export from new locations:
- `lib/api.ts` → repositories/children.repo + grades.repo + services/coins.service
- `lib/wallet-api.ts` → repositories/wallet.repo
- `lib/flexible-api.ts` → repositories/schedule.repo
- `lib/expenses-api.ts` → repositories/expenses.repo
- `lib/categories-api.ts` → repositories/categories.repo
- `lib/badges.ts` → services/badges.service
- `lib/streaks.ts` → services/streaks.service
- `lib/onboarding-api.ts` → services/onboarding.service
- `lib/push-api.ts` → services/push.service
- `lib/schedule-api.ts` → repositories/schedule.repo

## Authentication Flow

```typescript
// middleware.ts (getUser() re-validates JWT)
// Unauthenticated + non-public path → /
// Authenticated without family membership → /onboarding
// Authenticated at '/' → role-based: parent → /parent-center (mobile) or
//   /parent/dashboard (desktop); child → /kid/day
// Guards: /parent/* parent-only; /kid/* child-only (parent ?preview=true allowed)
// Children sign in at /kid/login (family code + PIN → synthetic Supabase Auth user)
```

## Real-time Chat (Supabase Realtime)

```typescript
const channel = supabase
  .channel(`family:${familyId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `family_id=eq.${familyId}`
  }, (payload) => addMessage(payload.new))
  .subscribe()
```

## Coding Principles

1. **TypeScript everywhere** — strict typing, no `any`
2. **Server Components** where no interactivity needed
3. **Optimistic UI** — UI updates instantly, request goes in background
4. **Error boundaries** — each section wrapped in error boundary
5. **Loading states** — skeleton loaders everywhere
6. **Mobile-first** — all components tested at 375px first
7. **Accessibility** — aria-labels, keyboard navigation, contrast ratio
