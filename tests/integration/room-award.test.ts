// tests/integration/room-award.test.ts
// Integration coverage for the room_checks-driven room award computation in
// /api/wallet/award, against the LIVE Supabase DB (service-role key).
// Formalizes 05.2-03's must-haves: parity with the legacy room_ok rule for a
// default 5-task family, below-threshold non-award, and the fallback to
// day.room_ok when the child has zero room_checks rows for a date.
//
// IMPORTANT (plan-checker 2026-07-06): createTestFamily() inserts the
// families row DIRECTLY via the service client — it bypasses both the
// migration's one-time backfill (which only ran for families that existed
// at migration time) and createFamily()'s JS-side seed call. No DB trigger
// seeds room_tasks on a bare families INSERT. This suite therefore seeds its
// own room_tasks in beforeAll via seed_default_room_tasks(), and cleans up
// room_checks in afterAll before destroyTestFamily (which itself has no
// knowledge of these two tables). room_tasks CANNOT be deleted directly —
// the 05.2-01 legacy-delete guard blocks direct deletes of legacy-mapped
// tasks — they are removed by the families FK ON DELETE CASCADE inside
// destroyTestFamily (cascade runs at pg_trigger_depth >= 2, passing the guard).
//
// Auth is mocked at the requireFamilyMember() boundary only, mirroring
// award.test.ts — everything below that runs for real.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  destroyTestFamily,
  type TestFamily,
} from './family-fixture'

const mockRequireFamilyMember = vi.fn()

vi.mock('@/lib/supabase/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/admin')>()
  return {
    ...actual,
    requireFamilyMember: () => mockRequireFamilyMember(),
  }
})

// The award route now imports lib/services/streaks.service (05.5-02 D-12.2),
// which transitively imports the anon browser singleton in lib/supabase.ts —
// a module that THROWS at import time when NEXT_PUBLIC_SUPABASE_URL is absent.
// Mock it so this suite still loads (and skipIf-skips) without integration env.
// The server award path never touches the anon singleton (updateStreaks runs
// entirely on the admin client), so the empty stub is inert when tests DO run.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// vi.mock is hoisted above imports by vitest, so this static import resolves
// against the mocked '@/lib/supabase/admin'.
import { POST } from '@/app/api/wallet/award/route'

const COINS_PER_ROOM_TASK = 3 // SETTINGS_DEFAULTS.coins_per_room_task — no wallet_settings row for the test family.

const DATE_PARITY = '2020-03-01'
const DATE_BELOW_THRESHOLD = '2020-03-02'
const DATE_FALLBACK = '2020-03-03'

function postAward(childId: string, date: string) {
  const req = new NextRequest('http://localhost/api/wallet/award', {
    method: 'POST',
    body: JSON.stringify({ childId, date }),
  })
  return POST(req)
}

describe.skipIf(!hasIntegrationEnv)('POST /api/wallet/award — room_checks (05.2-03)', () => {
  let family: TestFamily
  let taskIds: string[] = [] // 5 default legacy-mapped task ids, in seed sort_order (bed, floor, desk, closet, trash)
  const db = hasIntegrationEnv ? serviceClient() : null!

  beforeAll(async () => {
    family = await createTestFamily()

    // createTestFamily() bypasses both the migration backfill and
    // createFamily()'s JS seed — seed this family's room_tasks ourselves.
    const { error: seedErr } = await db.rpc('seed_default_room_tasks', {
      p_family_id: family.familyId,
    })
    expect(seedErr).toBeNull()

    const { data: tasks, error: tasksErr } = await db
      .from('room_tasks')
      .select('id, legacy_key, sort_order')
      .eq('family_id', family.familyId)
      .order('sort_order', { ascending: true })
    expect(tasksErr).toBeNull()
    expect(tasks?.length).toBe(5)
    taskIds = (tasks ?? []).map((t: { id: string }) => t.id)
  })

  afterAll(async () => {
    // Safety net if the teardown test below fails early. Idempotent.
    // room_checks deleted explicitly; room_tasks are legacy-guard-protected
    // against direct deletes and go via the families FK cascade in cleanup().
    await db.from('room_checks').delete().eq('child_id', family.childId)
    await family.cleanup()
  })

  it('parity: 3 of 5 done room_checks credits coins_per_room_task exactly once, idempotently', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    // days row: 3 of 5 legacy booleans true so room_ok is ALSO true (trigger-
    // derived) — proves the room_checks path is authoritative, not room_ok,
    // while keeping both signals consistent for this parity case.
    const { error: dayErr } = await db.from('days').insert({
      child_id: family.childId,
      date: DATE_PARITY,
      room_bed: true,
      room_floor: true,
      room_desk: true,
    })
    expect(dayErr).toBeNull()

    // 3 done room_checks rows (bed, floor, desk — first 3 seeded task ids).
    const { error: checksErr } = await db.from('room_checks').insert(
      taskIds.slice(0, 3).map((taskId) => ({
        child_id: family.childId,
        family_id: family.familyId,
        date: DATE_PARITY,
        task_id: taskId,
        done: true,
      })),
    )
    expect(checksErr).toBeNull()

    const res = await postAward(family.childId, DATE_PARITY)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'room')
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0]?.coins_change).toBe(COINS_PER_ROOM_TASK)

    // Second POST — idempotency: no new 'room' transaction for the same day.
    const res2 = await postAward(family.childId, DATE_PARITY)
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.awards).toBe(0)

    const { data: txsAfter, error: txErr2 } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'room')
    expect(txErr2).toBeNull()
    expect(txsAfter?.length).toBe(1)
  })

  it('below threshold: 2 of 5 done room_checks credits nothing', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    // Only 2 legacy booleans true → room_ok is false too (irrelevant here
    // since room_checks rows exist and take priority).
    const { error: dayErr } = await db.from('days').insert({
      child_id: family.childId,
      date: DATE_BELOW_THRESHOLD,
      room_bed: true,
      room_floor: true,
    })
    expect(dayErr).toBeNull()

    const { error: checksErr } = await db.from('room_checks').insert(
      taskIds.slice(0, 2).map((taskId) => ({
        child_id: family.childId,
        family_id: family.familyId,
        date: DATE_BELOW_THRESHOLD,
        task_id: taskId,
        done: true,
      })),
    )
    expect(checksErr).toBeNull()

    const res = await postAward(family.childId, DATE_BELOW_THRESHOLD)
    expect(res.status).toBe(200)

    const { data: dayRow } = await db
      .from('days')
      .select('id')
      .eq('child_id', family.childId)
      .eq('date', DATE_BELOW_THRESHOLD)
      .single()
    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'room')
      .eq('source_id', dayRow!.id)
    expect(txErr).toBeNull()
    expect(txs?.length ?? 0).toBe(0)
  })

  it('fallback: zero room_checks rows for the date credits via legacy day.room_ok', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    // 3 legacy booleans true → room_ok true (trigger-derived). NO room_checks
    // rows inserted for this date — the route must fall back to room_ok.
    const { error: dayErr } = await db.from('days').insert({
      child_id: family.childId,
      date: DATE_FALLBACK,
      room_bed: true,
      room_floor: true,
      room_desk: true,
    })
    expect(dayErr).toBeNull()

    const { data: checksForDate } = await db
      .from('room_checks')
      .select('id')
      .eq('child_id', family.childId)
      .eq('date', DATE_FALLBACK)
    expect(checksForDate?.length ?? 0).toBe(0)

    const res = await postAward(family.childId, DATE_FALLBACK)
    expect(res.status).toBe(200)

    // Scope the assertion to THIS date's day id — exactly one 'room' tx for
    // the fallback day, credited at the default coins_per_room_task.
    const { data: dayRow } = await db
      .from('days')
      .select('id')
      .eq('child_id', family.childId)
      .eq('date', DATE_FALLBACK)
      .single()
    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'room')
      .eq('source_id', dayRow!.id)
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0]?.coins_change).toBe(COINS_PER_ROOM_TASK)
  })

  it('teardown leaves zero room_checks/room_tasks/wallet_transactions for the test child', async () => {
    // room_checks: direct delete (no guard). room_tasks: legacy-mapped rows
    // are protected by the 05.2-01 delete-guard trigger against DIRECT
    // deletes — they are removed by the families FK cascade fired inside
    // destroyTestFamily (cascade-nested delete passes the guard).
    await db.from('room_checks').delete().eq('child_id', family.childId)
    await destroyTestFamily(family.familyId, family.childId)

    const { data: remainingChecks, error: checksErr } = await db
      .from('room_checks')
      .select('id')
      .eq('child_id', family.childId)
    expect(checksErr).toBeNull()
    expect(remainingChecks?.length ?? 0).toBe(0)

    const { data: remainingTasks, error: tasksErr } = await db
      .from('room_tasks')
      .select('id')
      .eq('family_id', family.familyId)
    expect(tasksErr).toBeNull()
    expect(remainingTasks?.length ?? 0).toBe(0)

    const { data: remainingTx, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
    expect(txErr).toBeNull()
    expect(remainingTx?.length ?? 0).toBe(0)
  })
})
