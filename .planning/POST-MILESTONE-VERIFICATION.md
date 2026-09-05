---
title: Post-milestone verification sweep — deferred human_needed / gaps_found items
date: 2026-09-05
scope: the 8 VERIFICATION.md reports + 2 HUMAN-UAT.md files deferred at v5.0 close
---

# Post-milestone verification sweep (2026-09-05)

Every `human_verification` item carried across the deferred backlog, triaged and
resolved as far as automation/code/DB inspection allows. Items that genuinely
need a physical device or a browser click are collected into the single
**Operator checklist** at the bottom — nothing else is outstanding.

Verification tools used: `scripts/verify-migrations-applied.mjs` (prod DDL),
direct `SUPABASE_DB_URL` queries, `npm test` (193 tests), `npx tsc --noEmit`,
`npm run build`, and code reads.

---

## Closed by this sweep (no operator action needed)

| Report | Item | Resolution |
|--------|------|------------|
| 01.3-3 | Linked-account children missing from ScheduleEditor / TaskManager | **Closed — dead code.** The `ScheduleEditor` / `TaskManager` this item describes (the ones calling `getFamilyChildren()`, whose `get_family_children` RPC filters `NOT has_real_account`) were part of the legacy `/settings` page. Phase 5.11 removed that page but left the components; they have **zero imports** anywhere. Deleted them (`components/ScheduleEditor.tsx`, `components/settings/ScheduleEditor.tsx`, `components/settings/TaskManager.tsx`). The shipping schedule UI is Parent Center → Settings → Schedule (`SubjectsManager` / `DayBlocksManager` / `SectionsManager` / …), fed by `allChildren` ← `getChildren()` (the `children` table, **no account-status filter**), so every child is already visible there. |
| 02.2-1 | Do grades actually award coins? | **Closed — obsolete framing.** The entire v5.0 money model answers this: `/api/wallet/award` recomputes coin awards server-side from saved `subject_grades` rows, idempotent per `(child_id,'grade',grade_id)`. Covered by `tests/integration/award.test.ts` ("credits every award source type") against the live DB. |
| 02.2-2 | Does changing "Оценка 5" in settings affect the award? | **Closed.** Grade coin values are `wallet_settings.grade_coin_map` (Phase 5.9), read by `gradeCoins()` in the award route — no hardcoded values remain. `tests/integration/award.test.ts` + `tests/presets.test.ts` exercise settings-driven amounts. |
| 02.2-3 | Dark-theme parent nav visual check | **Closed — superseded.** The parent UI was fully rebuilt on `lib/design/tokens.ts` in Phases 5.7/5.8; the v2.2 dark theme this item describes no longer exists. |
| 3.1-5 | `medals` table migrated with RLS | **Closed.** `medals` present in prod (migration audit, 61 public tables); `verify-migrations-applied.mjs` green. |
| 3.2-1 | Kid chat `sender_id` is a `children.id` string, not a `family_members` UUID | **Closed.** `app/kid/(app)/chat/page.tsx` resolves the `family_members` row by `child_id` and passes `member.id` (UUID) as `currentMemberId` → `sendMessage({ senderId })` → `sender_id`. The v3.2 'adam'/'alim' concern was removed with the Phase 1.4 de-hardcode. |
| 3.2-2 | System-message auto-posts (badge/coin → chat) | **Code-verified, low risk.** `postSystemMessage` path present in `chat.repo.ts` (`sender_id: 'system'`); trigger chain intact. Not independently re-run against live Realtime — see operator checklist if a live check is wanted. |
| 04.4-5 | Audit screen shows shop_approve/reject events | **Unblocked + hardened.** `parent_audit_events` exists in prod; **and** the 6 server-side `insertAuditEvent` call sites were just switched to the service-role client (they were silently RLS-denied before — commit `f760ef3`), so approve/reject from server actions now actually write the row the Audit screen reads. |
| 05.10-1..4 | Trust-limit / allowance persistence + cron idempotency | Already closed 2026-07-23 by `tests/integration/automation-settings-persistence.test.ts` + `allowance.test.ts` (see `05.10-HUMAN-UAT.md`). Re-confirmed green in this sweep. |
| 05.8-1, 05.8-2 | Day-Constructor schedule-link picker location; Weekly-Summary chip color | **Code-verified** (write path `writeChildOverride → addDayBlock/updateDayBlock`; `getWeekScore` genuinely week-scoped, ratio `= (roomOkDays+behaviorDays)/(filledDays*2)` with no `/5` cap). Visual-only confirmation remains — operator checklist. |

---

## Operator status (2026-09-05)

Operator confirms the following are already validated through live production use
of the app with their own family — no further action:

| Was checklist item | Reports it closes | Operator note |
|---|---|---|
| PWA install prompt | 01.3-2 | Tried, works. |
| Sentry + PostHog | 05.1-1, 05.1-2 | Provisioned in the Vercel project "давно" (long since). |
| 05.8 visual re-confirmation | 05.8-1, 05.8-2 | In daily use, correct. |
| Real-device push — *previously* | 3.1-1..4, 05.10-5 | Operator tested push on a real device before and it worked. **Caveat below.** |

### One genuine open item — real-device push, current stack

`push_subscriptions` has **0 rows in the prod DB right now**. The whole push
infrastructure (`push_subscriptions` / `schedule_items` etc.) was rebuilt when
the never-applied Phase 1.3 migration was finally run on 2026-07-23 — any
successful push test before that date was on the earlier setup. The write path
is verified correct now (RLS `ALL` for the authed member scoped to their family;
unique index `push_subscriptions_member_endpoint_idx` matches the upsert's
`onConflict`), but nobody has subscribed since the rebuild, so nothing is being
delivered.

**30-second confirm:** on one device, open the app → Settings → Уведомления →
allow → tap the test button. Then `select count(*) from push_subscriptions`
should be ≥ 1 and the device should show the notification. Once that row exists,
the daily cron's section / unfilled-day / streak-at-risk pushes will reach it.

### Still not verified — COPPA / data-export browser flows (04.4-1..4)

Not covered by operator's note. Low urgency (single-family use, no under-13
onboarding happening), left for whenever convenient:
- Settings → Account → Download Data Export → unzip → `family-data.json` + CSVs.
- Danger Zone: data-summary counts real; Delete button disabled until input is
  exactly `DELETE`.
- Family Manager: add a child with age < 13 → COPPA consent modal gates creation.
