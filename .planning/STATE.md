---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-05T18:35:02.448Z"
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 25
  completed_plans: 25
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-04-05 — Phase 2.2 plan 08 complete (coach rating configurable + settings audit log)

---

## Текущая позиция

```
Phase: 2.3 (IN PROGRESS — plan 03 of 6 done)
Plan: 02.3-03 — COMPLETE (/kid/wallet — balance, history, withdrawal, requests)
Status: Phase 2.3 in progress. Next: 02.3-04
Last activity: 2026-04-06 — 02.3-03 complete: /kid/wallet screen (419 lines), TypeScript clean, uses Zustand activeMemberId
```

Progress bar (M2):
```
[>         ] 0 / 5 phases complete (1/6 plans in phase 2.3 done)
```

---

## Milestone 1 — Foundation (COMPLETE)

All 4 phases shipped:
- Phase 1.1: New multi-tenant DB schema with RLS + Supabase Auth
- Phase 1.2: Registration, onboarding wizard, child join flow
- Phase 1.3: Flexible categories, schedule, push notifications
- Phase 1.4: Full dashboard refactor — zero hardcoded adam/alim

---

## Milestone 2 — Role-Based UI (IN PROGRESS)

```
Phase 2.1  [ ] role-routing         — REQ-ROLE-001–004 (4 reqs)
Phase 2.2  [ ] parent-center        — REQ-PARENT-001–007, REQ-DAY-002–013, REQ-COIN-001–011, REQ-WAL-001–006, REQ-SHOP-001–002/005–006, REQ-ANL-001–006, REQ-UX-002–003, REQ-SEC-002/006 (46 reqs)
Phase 2.3  [ ] kid-screen           — REQ-KID-001–007, REQ-SHOP-003, REQ-BAD-001–002/004–006, REQ-STR-001–004 (18 reqs)
Phase 2.4  [ ] shop-approval        — REQ-SHOP-004/007–008, REQ-PARENT-008 (4 reqs)
Phase 2.5  [ ] notifications-anims  — REQ-UX-004, REQ-BAD-003, REQ-STR-005–006, REQ-SCH-004–006 (7 reqs)
```

Total M2 requirements mapped: 79

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Milestone v2.0 — Role-Based UI → Phase 2.1: role-routing

---

## Accumulated Context

### Decisions from Milestone 1

| Решение | Выбор | Причина |
|---|---|---|
| Платформа | PWA → Native | Быстрый запуск, потом App Store |
| Стек | Next.js + Supabase + Tailwind | Уже используется, не менять |
| Auth | Supabase Auth (email + Google) | Встроено в Supabase |
| Стейт | Zustand | Уже используется |
| Чат | Supabase Realtime | Встроено, реал-тайм |
| Монеты | Виртуальные + конвертация в деньги | Гибкость |
| Магазин | Родитель создаёт позиции | Гибкость |
| Подтверждение покупок | Родитель одобряет | Контроль |

### New decisions (Milestone 2)

| Решение | Выбор | Причина |
|---|---|---|
| UI split | /parent/* + /kid/* + /family/* | Role-based routing from the start |
| Backend | Keep existing lib/ + Supabase | No backend rewrite — frontend only |
| Old pages | Remove after new ones ready | Avoid dead code accumulation |
| Phase order | role-routing first | Everything else depends on correct routing |
| Coin engine | Built in Phase 2.2 (parent center) | Parent daily input is where coins originate |
| Purchase approval | Separate Phase 2.4 | Distinct user flow, depends on both parent + kid screens |
| Placeholder styling | Inline styles only (no Tailwind/globals.css) | Scaffold pages isolated from styling system |
| Legacy kid page | app/kid/page.tsx kept intact | New route is /kid/day (subdirectory), no conflict |
| Middleware role query | Single family_members query per request | One round-trip covers both root redirect and path guards |
| Fail-open on DB errors | Only redirect to /onboarding when !membershipError && !membership | Transient DB errors do not lock users out |
| ParentNav responsive | Two separate nav elements (desktop top + mobile bottom) | Simpler than JS resize detection, pure CSS |
| Middleware /parent bypass | Added /parent to isPublicPath for dev | Auth not yet wired; explicit TODO to remove |
| Grade distribution source | Direct Supabase query on subject_grades | getWeekScore only returns aggregated coin numbers, not raw grade records |
| DailyModal embed mode | isOpen=true + onClose no-op in /parent/daily | Parent daily page always shows form, not in modal overlay |
| Streak bonus ordering | updateStreaks() first, then getStreakBonuses() | Must update counters before reading thresholds |
| Parent PIN storage | SHA-256 hash in localStorage (key: parent_pin_hash) | No DB round-trip; zero server dependency for PIN verification |
| auto_approve type | Partial<Reward> & { auto_approve?: boolean } intersection | Avoids modifying canonical Reward type until DB migration runs |
| Shop admin view | getRewards({ activeOnly: false }) | Parent needs to see inactive items to re-enable them |
| createP2PTransfer params | Use actual repo signature (from_child_id, to_child_id, amount, transfer_type) | Plan's simplified interface was inaccurate vs actual implementation |
| Exchange panel default | Collapsible (collapsed by default) | Reduces visual noise on /parent/wallets page |
| Grades 1/2 coin penalties | Hardcoded (-10, -5) | wallet_settings has no coins_per_grade_1/2 fields |
| Grade 3 coins from settings | Negated: -settings.coins_per_grade_3 | Stored as positive in DB, applied as deduction |
| Coach rating in sections | Local UI state only (not persisted to DB) | section_visits only stores text trainer_feedback |
| Coach penalty DB storage | Stored as positive integers (coins_per_coach_2=3 → -3 coins) | Consistent with grade 3 positive-stored penalty pattern |
| Settings change audit log | Insert to wallet_transactions per child with transaction_type='settings_change', coins_change=0 | getAuditLog() reads wallet_transactions, so this appears in per-child journal without special handling |

### New decisions (Phase 2.3)

| Решение | Выбор | Причина |
|---|---|---|
| KidLayout structure | Server component; KidNav is 'use client' | usePathname requires client context; layout itself needs no client state |
| Mobile nav height | 64px + env(safe-area-inset-bottom) via kid-nav-bottom class | iOS safe area support for bottom bar |
| Desktop nav | sticky top-0 h-16 matching md:pt-16 on main | No JS resize detection; pure CSS with Tailwind breakpoints |
| /kid root page | Server-side redirect('/kid/day') replaces broken localStorage component | Server redirect is instant; no client JS required |
| 4 new badges | Added to existing BADGES array (single source of truth) | One array = one getAvailableBadges() call returns all 10 |
| checkFullWeekGrades import | Uses top-level getWeekRange import (not dynamic import) | getWeekRange already imported at file top; dynamic import unnecessary |
| getWeekData return shape | Returns { days: DayData[], grades: SubjectGrade[], sports, weekRecord } — per-day arrays | Week stats computed from actual per-day rows (room_ok, good_behavior) not aggregate fields |
| Kid Day XP bar | width = (xp % 1000) / 10 percent | Treats each 1000 XP as one full level cycle for clean progress display |
| getTransactions pagination | Growing limit (20→40→60) instead of offset param | Actual repo signature has no offset parameter |
| getWeekScore field names | coinsFromGrades/coinsFromRoom/coinsFromBehavior (not grades/room/behavior) | Actual service returns different field names than plan spec; sport shows 0 |
| RewardPurchase status display | fulfilled boolean maps to approved/pending | No status field on RewardPurchase type |

---

*Файл STATE.md обновляется автоматически GSD агентами после каждой фазы.*
