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
