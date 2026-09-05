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

## Operator checklist (genuinely manual — device / browser / provisioning)

These cannot be scripted. None block correctness; all are confirmations or
account-provisioning steps.

### Push delivery on a real device (covers 01.3-1, 3.1-1..4, 05.10-5)
1. On a phone/desktop browser, open the app, go to Settings → Уведомления, allow
   notifications, tap the test-notification button. Expect a visible push.
2. With that subscription live, have a parent approve a shop purchase / send a
   Medal of the Day / trigger a badge. Expect a push on the child device, deep-
   linking to the right screen.
3. `push_subscriptions` has **0 rows in prod** today — no device has ever
   subscribed (no working delivery path existed before the Phase 5.10 fix). This
   check also validates that the subscribe flow itself now works end-to-end.

### PWA install (01.3-2)
4. Open the site in Chrome on Android / Safari on iOS → confirm the install /
   "Add to Home Screen" prompt appears and the app opens standalone.

### Sentry + PostHog provisioning (05.1-1, 05.1-2)
5. Create a Sentry project, add `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` to Vercel
   Production, redeploy, `GET /api/health?boom=1` → expect a 500 and an issue in
   Sentry within ~2 min. (Code no-ops cleanly without the DSN — verified.)
6. Create a PostHog EU project, add `NEXT_PUBLIC_POSTHOG_KEY` to Vercel
   Production, redeploy, browse + save a day → expect `$pageview` and `day_saved`
   events in PostHog Live Events.

### Account / COPPA browser interactions (04.4-1..4)
7. Settings → Account → Download Data Export → unzip → confirm `family-data.json`
   + the CSV set.
8. Danger Zone: confirm the data-summary counts are real; the Delete button
   stays disabled until the confirm input is exactly `DELETE`.
9. Family Manager: add a child with age < 13 → the COPPA consent modal blocks
   creation until the checkbox is ticked; Cancel creates nothing.

### 05.8 visual re-confirmation (05.8-1, 05.8-2)
10. Parent Center → Settings → Schedule → Day Constructor → a child's own tab →
    Room row → 🔗 Schedule link → pick an item → expect a green "Custom" tag +
    synced StatusChip on that child's row only; "None" clears it.
11. Parent Center → Analytics → Weekly Summary → "Tasks done" chip shows
    green/yellow per real week performance, not permanently red.
    *(Hard-refresh / unregister the service worker first — the 05.8-09 session
    was misled by a stale cached bundle.)*
