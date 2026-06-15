# Testing Strategy

> No test suite exists yet. This document defines the target strategy.

## Current State

- `npx tsc --noEmit` — type checking (primary verification tool)
- `npm run lint` — ESLint (configured 2026-06-15; passes with warnings only)
- `npm run build` — production build (catches runtime errors)
- `npm test` — vitest (a small suite exists)
- **Live DB verification scripts** (`node --env-file=.env.local scripts/<x>.mjs`,
  use the service-role key, create isolated throwaway families, self-clean):
  - `verify-wallet-rls.mjs` — money tables: child can read, cannot write; anon denied
  - `verify-award-idempotency.mjs` — `(child_id, source_type, source_id)` uniqueness
  - `verify-award-reads.mjs` — award route source reads resolve against live schema
  - Pattern also used for ad-hoc HTTP smoke tests (sign in with a cookie jar via
    `@supabase/ssr`, hit `/api/wallet/*` against `npm run dev`).
- Manual UAT via browser / GSD `/gsd:verify-work`

## Target Strategy

### Unit Tests (lib/services/, lib/repositories/)
- Framework: Vitest (preferred over Jest, faster with Next.js)
- Scope: pure business logic functions
- Priority tests:
  - `coins.service.ts`: getWeekScore calculation
  - `coins.service.ts`: awardCoinsForGrade — correct coin amounts
  - `streaks.service.ts`: streak calculation edge cases
  - `badges.service.ts`: badge award conditions

```ts
// Example: coins.service.test.ts
describe('getWeekScore', () => {
  it('calculates grade coins correctly', () => {
    // grade 5 = +5, grade 3 = -3
  })
  it('counts room_ok days', () => {})
  it('counts behavior days', () => {})
})
```

### Integration Tests (Supabase)
- Framework: Vitest + Supabase test helpers
- Use test family with fixed family_id
- Scope: repository functions against local Supabase
- Priority: onboarding flow, wallet operations

### E2E Tests
- Framework: Playwright
- Scope: critical user journeys
- Priority flows:
  1. Register → create family → add child → complete onboarding
  2. Parent opens DailyModal → enters grades → saves → coins update
  3. Child views wallet → makes purchase → parent approves

### Manual UAT Checklist (per phase)
After each GSD phase, verify:
- [ ] Build passes (`npm run build`)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Happy path works in browser
- [ ] No regressions on existing routes
- [ ] RLS: switch family accounts, verify isolation

## When to Add Tests

- Phase 2.1 (Coin Engine): add unit tests for coin calculation
- Phase 2.2 (Wallet): add integration tests for wallet operations
- Phase 4.x (PWA Polish): add E2E tests for critical flows
