---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Communication
status: planning
last_updated: "2026-04-13"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# STATE.md — Текущее состояние проекта

> Обновляется после каждой фазы. Последнее обновление: 2026-04-13 — Milestone v2.0 Role-Based UI COMPLETE. Starting v3.0 Communication.

---

## Текущая позиция

```
Milestone v2.0 COMPLETE — all 7 phases shipped (2.1–2.6 + 2.4.1)
Next: Milestone v3.0 — Communication (Phase 3.1: notifications)
Status: Between milestones. Run /gsd:new-milestone to plan v3.0.
```

---

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Any family can register and use the app — children earn coins for real effort, spend them on real rewards
**Current focus:** Milestone v3.0 — Communication → real-time family chat, push notifications, media sharing

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
| RewardPurchase date field | purchased_at used (not created_at) | Per actual wallet.types.ts; plan spec used wrong field name |
| /kid/shop purchase reload | Reload wallet + purchases after purchaseReward() | Reflects deducted coins immediately without full page refresh |
| computeBadgeProgress | Async function outside component, called in useEffect after data load | Keeps component state management clean; not a hook |
| BadgeDetailSheet | Inlined in main JSX using selectedBadge state | Avoids extra prop drilling for single-use overlay |
| PodiumBlock placement | Inlined in leaderboard page file | Single-use sub-component, no external export needed |
| CelebrationOverlay localStorage | Timestamp updated regardless of badge found | Prevents same badge re-triggering when lastCheckTime is 0 |
| Leaderboard period scoring | week=weekScore.total, month=wallet.coins, all=child.xp | Three distinct ordering signals per period |

### New decisions (Phase 2.4.1)

| Решение | Выбор | Причина |
|---|---|---|
| kid_fill_mode default | 1 (most restrictive) | Safe default for existing children — opt-in to more permissions |
| filled_by column | Allows NULL | Legacy parent-only records remain valid without data migration |
| mood column | TEXT (not enum) | Flexibility for emoji key values without schema migration per new mood |
| getExtraActivitiesByDayType | Use getExtraActivities(childId, dayType) | Plan referenced non-existent function; actual function accepts optional dayType param |
| logActivity batch | Use saveActivityLogs batch | Plan referenced non-existent logActivity; saveActivityLogs upserts all activity rows at once |
| KidDayFillForm Set iteration | Array.from(checkedActivities) | TypeScript tsconfig targets ES5; direct for...of on Set requires downlevelIteration flag |
| coinsPreview | useMemo (not useState) | Synchronous update on every render without extra state; plan specified this pattern |
| loadData as useCallback | Re-invoked after KidDayFillForm save | Avoids full page reload; refreshes stats post-save inline |
| Celebration panel inline | Not CelebrationOverlay | Immediate deterministic feedback; CelebrationOverlay uses localStorage timing |
| kid_fill_mode type cast | (child as any)?.kid_fill_mode | Child type in lib/api.ts does not yet expose kid_fill_mode (added by DB migration, not yet in TypeScript model) |

### New decisions (Phase 2.4.1 plan 04)

| Решение | Выбор | Причина |
|---|---|---|
| Supabase import in settings | import { supabase } from '@/lib/supabase' (dynamic) | Project has no @/lib/supabase/browser; only singleton export |

### New decisions (Phase 2.4)

| Решение | Выбор | Причина |
|---|---|---|
| reward_purchases backward compat | DEFAULT 'approved' in migration | Existing rows remain valid without data migration |
| auto_approve bypass | Deduct immediately, status='approved', processed_by='auto' | Matches old purchaseReward() behavior for instant rewards |
| frozen_coins storage | Stored on purchase row (not derived) | Auditable; allows UI to show available balance = coins - frozen |
| rejectPurchase wallet | No wallet change needed | Coins were never deducted in pending flow |
| getPurchaseStatusLabel backward compat | p.status ?? (p.fulfilled ? 'delivered' : 'pending') | Old rows lack status field; fulfilled=true maps to delivered |
| Kid shop toast copy | 'Ждёт одобрения родителя' | Accurate: coins not deducted until parent approves |
| Approved purchases fetch | Direct Supabase query (status='approved') | getPendingPurchases only returns pending rows; no new repo function needed |
| handleApprove UI update | Moves item from pending list to approved list | Immediate UX feedback; item appears in delivery panel without page reload |
| Preview bypass | ?preview=true query param (stateless) | No session change needed; middleware checks param before redirecting non-child from /kid/* |

### New decisions (Phase 02.6 plan 04)

| Решение | Выбор | Причина |
|---|---|---|
| getUserByEmail | Try createUser first; fall back to listUsers on "already registered" | getUserByEmail absent from installed @supabase/auth-js version |
| activeMemberId in PIN login | Stores child_id TEXT slug | Kid pages pass activeMemberId to api.getChild/getWallet which expect TEXT child id |

### New decisions (Phase 02.6 plan 03)

| Решение | Выбор | Причина |
|---|---|---|
| child_id resolution after claim | Read child_id from family_members row directly | Avoids name-based resolveLegacyChildId which breaks for new families with slug IDs |
| Existing-member early-exit routing | role field from same SELECT → /kid/day or /parent/dashboard | No second query needed; child_id already in selected columns |

### New decisions (Phase 02.6 plan 02)

| Решение | Выбор | Причина |
|---|---|---|
| createFamily() duplicate parent row | UPSERT with onConflict: 'user_id,family_id' | Prevents crash when auth callback pre-inserts parent family_members row before wizard runs |
| parentDisplayName collection point | Wizard Step 1 (not /register) | /register captures only email+password; wizard is the first place to ask parent's name |
| /onboarding/page.tsx replacement | Server-side redirect('/onboarding/v2') replaces 1100-line stub | Stub had console.log mock save; real wizard is at /v2; redirect keeps auth callback routing intact |
| confetti import | Dynamic import in useEffect on step===4 | Prevents canvas-confetti from landing in SSR bundle |

### New decisions (Phase 02.6 plan 01)

| Решение | Выбор | Причина |
|---|---|---|
| generateChildId | Not exported (internal utility) | Slug generation is an implementation detail; callers use createChildWithWallet |
| wallet_settings row | Single global id='default' (not per-family) | Current app behavior; per-family settings deferred |
| coins_per_grade_3 default | -3 (negative) | Penalty per CLAUDE.md reward rules (3→-3 coins) |
| coins_per_grade_2 default | -5 (negative) | Penalty per CLAUDE.md reward rules (2→-5 coins) |
| children id collision retry | One retry with new generateChildId() | Low probability event; single retry sufficient before throwing |

### New decisions (Phase 02.5 plan 04)

| Решение | Выбор | Причина |
|---|---|---|
| PostgREST cs filter for array containment | .filter('day_of_week', 'cs', JSON.stringify([todayDow])) | .contains() PostgREST operator does not work for integer array containment; cs (contains) filter string does |
| Separate parent members query | Second query by family_id with role=parent filter | More precise than single-query join; avoids ID set ambiguity between child and parent UUIDs |

### New decisions (Phase 02.5 plan 03)

| Решение | Выбор | Причина |
|---|---|---|
| Set dedup in cron route | Array.from(new Set(...)) | tsconfig targets ES5; spread of Set requires downlevelIteration flag |
| vercel.json missed-tasks pre-declared | Pre-added /api/cron/missed-tasks at 0 20 * * * | Plan 04 only needs to create the route file, not modify vercel.json |
| Reminder window boundary | nowMinutes in [reminderMinutes-4, reminderMinutes] inclusive | 5-min inclusive range matches cron frequency; fires once per reminder |

### New decisions (Phase 02.5 plan 02)

| Решение | Выбор | Причина |
|---|---|---|
| Server Action dynamic import in client | import('@/app/actions/push-streaks').then(...) | Avoids 'use server' top-level import boundary violation in client components |
| Push send fire-and-forget | .catch(() => {}) after dynamic import | Push delivery never blocks day-save flow |
| KidDayFillForm streak update | Added updateStreaks() call (was missing) | KidDayFillForm had no streak update; needed for event detection |
| childName parameter | Empty string fallback | Notification text doesn't include child name; param kept for API extensibility |

---

*Файл STATE.md обновляется автоматически GSD агентами после каждой фазы.*
