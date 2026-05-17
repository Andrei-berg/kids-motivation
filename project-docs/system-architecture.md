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
│   └── server.ts              # Server client (async cookies)
├── store.ts                   # Zustand global store
└── supabase.ts                # Legacy browser client (backward compat)
```

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
// middleware.ts
// Unauthenticated → /login
// Authenticated without family → /onboarding/welcome
// Authenticated with family → /dashboard
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
