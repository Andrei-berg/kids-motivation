# Constraints & Known Issues

## Tech Debt
- Legacy `children` table uses `id TEXT` ('adam'/'alim') — all wallet/grades/days tables reference this
- `lib/supabase.ts` legacy client still used by api.ts, wallet-api.ts, flexible-api.ts, expenses-api.ts, badges.ts, streaks.ts
- `app/wallboard/page.tsx` uses legacy `api.getChildren()` — not yet migrated to activeMemberId
- `CoinRules` and `StreakSettings` in localStorage — Phase 2.1 migrates to `coin_rules` DB table
- `lib/api.ts` exports `api` namespace object — this must be preserved in backward compat

## Deferred Tasks
- REQ-FAM-011: Delete family member UI (backend RLS protects it)
- REQ-SEC-002: Parent PIN — UI exists, no server enforcement
- P2P transfer dropdown for 2+ siblings — currently skipped (auto-select for 1 sibling)
- `/app/kid/page.tsx` — legacy page, not migrated

## Known Issues
- `subjects_cache` table autocomplete — works but cache may have stale data
- `wallet.money` uses NUMERIC — careful with JS floating point
- `push_subscriptions` conflict key uses JSONB path operator in unique index

## lib/ Refactor Status — COMPLETED (2026-03-08)
- `lib/models/` — all types extracted (child, wallet, flexible, expense, category, schedule, family)
- `lib/repositories/` — 6 repo files with full Supabase implementations
- `lib/services/` — coins.service, badges.service, streaks.service
- Old `lib/*.ts` — thin re-export wrappers (all existing import paths preserved)
- `npx tsc --noEmit` passes with 0 errors

## Phase 2.1 Scope
- New `coin_rules` table (family-scoped, configurable per category type)
- Remove hardcoded `GRADE_COINS` from api.ts, wallet-api.ts
- Migrate `CoinRules` from localStorage to DB
- Keep backward compat: existing wallet/days data unchanged
