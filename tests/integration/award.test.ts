// tests/integration/award.test.ts
// Integration coverage for /api/wallet/award against the LIVE Supabase DB
// (service-role key). Formalizes what scripts/verify-award-idempotency.mjs
// spot-checks: idempotency per (child_id, source_type, source_id), every
// award source type, the unique-index race backstop, and child-role gating
// of the parent-only "behavior" source.
//
// Auth is mocked at the requireFamilyMember() boundary (this suite invokes
// the route handler directly, in-process) — everything below that
// (createAdminClient, assertChildInFamily, creditAwards, wallet_apply) runs
// for real against a dedicated __test__ family created/torn down by
// tests/integration/family-fixture.ts. describe.skipIf keeps `npm test`
// green without integration env keys.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  destroyTestFamily,
  type TestFamily,
} from './family-fixture'

// requireFamilyMember is the only thing this suite mocks — set per-test via
// mockRequireFamilyMember.mockResolvedValue(...). Everything else in
// '@/lib/supabase/admin' (createAdminClient, assertChildInFamily, AuthError)
// is the real implementation, running against the live DB.
const mockRequireFamilyMember = vi.fn()

vi.mock('@/lib/supabase/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/admin')>()
  return {
    ...actual,
    requireFamilyMember: () => mockRequireFamilyMember(),
  }
})

// vi.mock calls are hoisted above imports by vitest, so this static import
// resolves against the mocked '@/lib/supabase/admin'.
import { POST } from '@/app/api/wallet/award/route'

// Mirrors app/api/wallet/_lib.ts SETTINGS_DEFAULTS — the test family has no
// wallet_settings row, so loadSettings() falls back to these exact values.
const EXPECTED = {
  room: 3,
  behavior: 5,
  grade5: 10,
  coach5: 10,
  activity: 7, // set on the test's extra_activities row, not a settings default
  book: 20,
  // Default parity (SC2): the test family has no wallet_settings row, so
  // loadSettings() falls back to SETTINGS_DEFAULTS — room streak >=7 days
  // yields exactly the default streak_room_bonus (100), no override.
  streakRoomDefault: 100,
}

const TEST_DATE = '2020-01-15'
const CHILD_ROLE_DATE = '2020-02-20'
const STUDY_STREAK_DATE = '2020-03-10'

function postAward(childId: string, date: string) {
  const req = new NextRequest('http://localhost/api/wallet/award', {
    method: 'POST',
    body: JSON.stringify({ childId, date }),
  })
  return POST(req)
}

describe.skipIf(!hasIntegrationEnv)('POST /api/wallet/award — integration', () => {
  let family: TestFamily
  const db = hasIntegrationEnv ? serviceClient() : null!

  beforeAll(async () => {
    family = await createTestFamily()
  })

  afterAll(async () => {
    // Idempotent — the "teardown removes all rows" test below already calls
    // destroyTestFamily once; this is a safety net if that test fails early.
    await family.cleanup()
  })

  it('credits every award source type on a single POST', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    // room_ok is DERIVED by a DB trigger (room_score_trigger / update_room_score)
    // from the individual room_* checklist booleans — room_ok := room_score >= 3.
    // Set 3 of 5 so room_ok comes back true after insert.
    const { error: dayErr } = await db.from('days').insert({
      child_id: family.childId,
      date: TEST_DATE,
      room_bed: true,
      room_floor: true,
      room_desk: true,
      good_behavior: true,
    })
    expect(dayErr).toBeNull()

    const { error: gradeErr } = await db.from('subject_grades').insert({
      child_id: family.childId,
      date: TEST_DATE,
      subject: 'Math',
      grade: 5,
    })
    expect(gradeErr).toBeNull()

    const { data: section, error: sectionErr } = await db
      .from('sections')
      .insert({ child_id: family.childId, name: 'Football' })
      .select('id')
      .single()
    expect(sectionErr).toBeNull()

    const { error: visitErr } = await db.from('section_visits').insert({
      section_id: section!.id,
      date: TEST_DATE,
      attended: true,
      coach_rating: 5,
    })
    expect(visitErr).toBeNull()

    const { data: activity, error: activityDefErr } = await db
      .from('extra_activities')
      .insert({ child_id: family.childId, name: 'Piano practice', coins: EXPECTED.activity })
      .select('id')
      .single()
    expect(activityDefErr).toBeNull()

    const { error: logErr } = await db.from('activity_logs').insert({
      child_id: family.childId,
      date: TEST_DATE,
      activity_id: activity!.id,
      done: true,
    })
    expect(logErr).toBeNull()

    const { error: readingErr } = await db.from('reading_log').insert({
      child_id: family.childId,
      date: TEST_DATE,
      book_title: 'Test Book',
      book_finished: true,
      verified: true,
    })
    expect(readingErr).toBeNull()

    const { error: streakErr } = await db.from('streaks').insert({
      child_id: family.childId,
      streak_type: 'room',
      current_count: 7,
    })
    expect(streakErr).toBeNull()

    const res = await postAward(family.childId, TEST_DATE)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('source_type, coins_change')
      .eq('child_id', family.childId)
    expect(txErr).toBeNull()

    const bySource = new Map((txs ?? []).map((t: { source_type: string; coins_change: number }) => [
      t.source_type,
      t.coins_change,
    ]))

    expect(bySource.get('room')).toBe(EXPECTED.room)
    expect(bySource.get('behavior')).toBe(EXPECTED.behavior)
    expect(bySource.get('grade')).toBe(EXPECTED.grade5)
    expect(bySource.get('sport')).toBe(EXPECTED.coach5)
    expect(bySource.get('activity')).toBe(EXPECTED.activity)
    expect(bySource.get('book')).toBe(EXPECTED.book)
    // Default parity (SC2): no wallet_settings row for this family → the
    // room streak (current_count=7, seeded above) yields exactly the default
    // streak_room_bonus (100) — not a floor, an exact value.
    expect(bySource.get('streak')).toBe(EXPECTED.streakRoomDefault)

    // Exactly one row per source_type — no duplicates from this single POST.
    expect(txs?.length).toBe(7)
  })

  it('idempotency: a second POST for the same child+date credits nothing more', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const { data: walletBefore } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    const { count: countBefore } = await db
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', family.childId)

    const res = await postAward(family.childId, TEST_DATE)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.creditedCoins).toBe(0)
    expect(body.awards).toBe(0)

    const { data: walletAfter } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    const { count: countAfter } = await db
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', family.childId)

    expect(walletAfter?.coins).toBe(walletBefore?.coins)
    expect(countAfter).toBe(countBefore)
  })

  it('unique-index backstop: a duplicate (child_id, source_type, source_id) insert fails with 23505', async () => {
    const dupeRow = {
      child_id: family.childId,
      family_id: family.familyId,
      transaction_type: 'earn_coins',
      coins_change: 0,
      money_change: 0,
      description: 'idempotency backstop self-test',
      icon: '🧪',
      balance_after_coins: 0,
      balance_after_money: 0,
      source_type: '__dup_test__',
      source_id: 'dup-1',
    }

    const first = await db.from('wallet_transactions').insert(dupeRow)
    expect(first.error).toBeNull()

    const second = await db.from('wallet_transactions').insert(dupeRow)
    expect(second.error).not.toBeNull()
    expect(second.error?.code).toBe('23505')
  })

  it('settings-driven (SC2/SC3): editing streak_study_days/bonus changes the streak award', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    // Use the STUDY streak type — never seeded elsewhere in this file, so no
    // UNIQUE(child_id, streak_type) collision with the permanent 'room' row
    // seeded in the first test. A dedicated date keeps this award idempotency
    // key (child_id, source_type='streak', source_id=date) independent of
    // every other test's date.
    //
    // computeStreakBonus sums the bonus across ALL of the child's qualifying
    // streaks for a given award call (not just the type under test) — the
    // permanent 'room' streak (current_count=7) from the first test still
    // exists on this shared child and would otherwise also fire (its default
    // streak_room_days=7 threshold is met), adding +100 on top. Push
    // streak_room_days out of reach (365, still within the settings-route's
    // writable clamp ceiling) so this award isolates the study contribution
    // to exactly 250.
    const { error: settingsErr } = await db.from('wallet_settings').upsert({
      id: family.familyId,
      family_id: family.familyId,
      streak_room_days: 365,
      streak_study_days: 1,
      streak_study_bonus: 250,
    })
    expect(settingsErr).toBeNull()

    const { error: streakErr } = await db.from('streaks').insert({
      child_id: family.childId,
      streak_type: 'study',
      current_count: 1,
    })
    expect(streakErr).toBeNull()

    try {
      const res = await postAward(family.childId, STUDY_STREAK_DATE)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)

      const { data: streakTx, error: txErr } = await db
        .from('wallet_transactions')
        .select('coins_change')
        .eq('child_id', family.childId)
        .eq('source_type', 'streak')
        .eq('source_id', STUDY_STREAK_DATE)
        .maybeSingle()
      expect(txErr).toBeNull()
      expect(streakTx?.coins_change).toBe(250)
    } finally {
      // Inline cleanup — belt and suspenders alongside the family_id-scoped
      // safety net added to destroyTestFamily() — so later tests in this
      // file (and the shared family) keep the default (no-row) behavior
      // even if an assertion above throws.
      await db.from('wallet_transactions')
        .delete()
        .eq('child_id', family.childId)
        .eq('source_type', 'streak')
        .eq('source_id', STUDY_STREAK_DATE)
      await db.from('streaks').delete().eq('child_id', family.childId).eq('streak_type', 'study')
      await db.from('wallet_settings').delete().eq('family_id', family.familyId)
    }
  })

  it('child-role gating: behavior is not credited when the caller is the child', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-child',
      familyId: family.familyId,
      role: 'child',
      childId: family.childId,
    })

    const { data: freshDay, error: dayErr } = await db
      .from('days')
      .insert({
        child_id: family.childId,
        date: CHILD_ROLE_DATE,
        room_ok: false,
        good_behavior: true,
      })
      .select('id')
      .single()
    expect(dayErr).toBeNull()

    const res = await postAward(family.childId, CHILD_ROLE_DATE)
    expect(res.status).toBe(200)

    const { data: behaviorTxs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', freshDay!.id)
    expect(txErr).toBeNull()
    expect(behaviorTxs?.length ?? 0).toBe(0)
  })

  it('teardown removes all wallet_transactions for the test child', async () => {
    await destroyTestFamily(family.familyId, family.childId)

    const { data: remaining, error } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
    expect(error).toBeNull()
    expect(remaining?.length ?? 0).toBe(0)
  })
})
