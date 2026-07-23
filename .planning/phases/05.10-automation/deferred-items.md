# Deferred Items — Phase 05.10-automation

## 05.10-03: `schedule_items` missing from live DB PostgREST schema cache

**Found during:** Plan 03, Task 2 verification (running `tests/integration/reminders-daily.test.ts`
against the live DB with `.env.local` present in this worktree for the first time).

**Symptom:** `tests/integration/reminders-daily.test.ts > counts an upcoming section training
scheduled for today` fails with `PGRST205: Could not find the table 'public.schedule_items' in
the schema cache` (hint: "Perhaps you meant the table 'public.schedule'").

**Scope:** Out of scope for 05.10-03 — this test file and the `schedule_items` table were created/
used by Plan 02 (`app/api/cron/daily/route.ts`'s section-training check), not touched by this
plan's allowance changes. The failure is in the pre-existing section-reminder query path, not the
allowance pass added in Task 2. `npx tsc --noEmit` is clean and both `tests/helpers.test.ts` and
`tests/integration/allowance.test.ts` pass fully against the same live DB, confirming this is
isolated to the `schedule_items` PostgREST cache, not a regression from this plan's diff.

**Not fixed here** per the executor's scope boundary (only auto-fix issues directly caused by the
current task's changes). Likely needs a PostgREST schema cache reload (`NOTIFY pgrst, 'reload
schema'`) or confirmation the `schedule_items` migration actually ran against this specific DB
instance — flag for the next phase/plan or an out-of-band fix.

## RESOLVED during phase 05.10 gap closure (post-verification, 2026-07-23)

Root cause was not a stale PostgREST cache — it was that
`supabase/migrations/01.3-categories-schedule.sql` (which defines `categories`, `tasks`,
`schedule_items`, and `push_subscriptions`) had **never been applied to production**, despite
Phase 1.3 being marked "Complete" in `ROADMAP.md`. Confirmed via `to_regclass()` against
`SUPABASE_DB_URL`: all four tables returned `NULL`. This blocked far more than this phase — every
push-notification code path in the app (`lib/push-api.ts`, `app/actions/push-notifications.ts`,
`app/api/push/send/route.ts`, `app/api/cron/missed-tasks/route.ts`, `app/api/cron/reminders/route.ts`)
and the categories/schedule repos had been shipping against tables that didn't exist.

Applied the migration to production (idempotent — `CREATE TABLE IF NOT EXISTS`); all 4 tables now
exist and RLS policies are active.

Applying the migration then surfaced a **second, independent bug**: the section-training query in
`app/api/cron/daily/route.ts` (and the identical pattern in `app/api/cron/missed-tasks/route.ts`)
used `.filter('day_of_week', 'cs', JSON.stringify([todayDow]))` — the Postgres array `cs` (contains)
operator expects Postgres array literal syntax (`{3}`), not JSON syntax (`[3]`). PostgREST rejected
every call with `22P02: malformed array literal`, and since the code only destructured `data` (not
`error`), this failed silently and always returned zero sections. Fixed both call sites to use
`` `{${todayDow}}` `` and added `error` logging. Also added per-child `try`/`catch` isolation around
`getStreaksAtRisk` and `creditAwards` in the daily cron loop (verifier's secondary finding) so one
child's exception can no longer abort reminders/allowance for the rest of the family base.

`tests/integration/reminders-daily.test.ts` now passes 6/6 (was 5/6). Full integration suite
(8 files, 54 tests) passes sequentially against live prod DB.
