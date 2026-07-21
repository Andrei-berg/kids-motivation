// tests/integration/behavior-award.test.ts
// Integration coverage for the behavior_marks-driven behavior award
// computation in /api/wallet/award, against the LIVE Supabase DB
// (service-role key). Formalizes Phase 5.9 Plan 06's must-haves: the
// approved-sum over behavior_marks (SC3b), pending marks crediting 0,
// same-tag repeatability (resolved OQ2), and the D-09 legacy
// day.good_behavior fallback for zero-row / pending-only / rejected-only
// dates (SC3b-fallback) plus no-double-credit when an approved mark AND
// day.good_behavior both exist.
//
// Modeled on tests/integration/room-award.test.ts. Auth is mocked at the
// requireFamilyMember() boundary only, mirroring award.test.ts — everything
// below that runs for real. Behavior is a PARENT-only assessment (mirrors
// the pre-existing day.good_behavior guard), so every case here invokes the
// award POST as a parent-role member.

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
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// vi.mock is hoisted above imports by vitest, so this static import resolves
// against the mocked '@/lib/supabase/admin'.
import { POST } from '@/app/api/wallet/award/route'

const COINS_PER_GOOD_BEHAVIOR = 5 // SETTINGS_DEFAULTS.coins_per_good_behavior — no wallet_settings row for the test family.

const DATE_APPROVED_SUM = '2020-05-01'
const DATE_PENDING_ZERO = '2020-05-02'
const DATE_SAME_TAG_TWICE = '2020-05-03'
const DATE_LEGACY_FALLBACK_ZERO = '2020-05-04'
const DATE_NO_DOUBLE_CREDIT = '2020-05-05'
const DATE_PENDING_ONLY_FALLBACK = '2020-05-06'
const DATE_REJECTED_ONLY_FALLBACK = '2020-05-07'

function postAward(childId: string, date: string) {
  const req = new NextRequest('http://localhost/api/wallet/award', {
    method: 'POST',
    body: JSON.stringify({ childId, date }),
  })
  return POST(req)
}

describe.skipIf(!hasIntegrationEnv)('POST /api/wallet/award — behavior_marks (05.9-06)', () => {
  let family: TestFamily
  let defaultTagId: string // legacy_key='good_behavior', seeded via RPC, price mirrors coins_per_good_behavior
  let tagAId: string // custom tag, positive price
  let tagBId: string // custom tag, negative price
  const db = hasIntegrationEnv ? serviceClient() : null!

  async function insertMark(date: string, tagId: string, status: 'pending' | 'approved' | 'rejected') {
    const { data, error } = await db
      .from('behavior_marks')
      .insert({ child_id: family.childId, family_id: family.familyId, date, tag_id: tagId, status })
      .select('id')
      .single()
    expect(error).toBeNull()
    return data!.id as string
  }

  beforeAll(async () => {
    family = await createTestFamily()

    // createTestFamily() bypasses both the migration's one-time backfill and
    // createFamily()'s JS seed — seed this family's default behavior tag
    // ourselves, mirroring room-award.test.ts's seed_default_room_tasks call.
    const { error: seedErr } = await db.rpc('seed_default_behavior_tags', {
      p_family_id: family.familyId,
    })
    expect(seedErr).toBeNull()

    const { data: defaultTag, error: defaultTagErr } = await db
      .from('behavior_tags')
      .select('id, price')
      .eq('family_id', family.familyId)
      .eq('legacy_key', 'good_behavior')
      .single()
    expect(defaultTagErr).toBeNull()
    defaultTagId = defaultTag!.id
    expect(defaultTag!.price).toBe(COINS_PER_GOOD_BEHAVIOR)

    const { data: tagA, error: tagAErr } = await db
      .from('behavior_tags')
      .insert({ family_id: family.familyId, name: 'Helped sibling', icon: '🤝', price: 8 })
      .select('id')
      .single()
    expect(tagAErr).toBeNull()
    tagAId = tagA!.id

    const { data: tagB, error: tagBErr } = await db
      .from('behavior_tags')
      .insert({ family_id: family.familyId, name: 'Rude to a parent', icon: '😤', price: -10 })
      .select('id')
      .single()
    expect(tagBErr).toBeNull()
    tagBId = tagB!.id
  })

  afterAll(async () => {
    // Safety net if the teardown test below fails early. Idempotent.
    // behavior_tags/behavior_marks have ON DELETE CASCADE from families/
    // children respectively, so family.cleanup() removes both.
    await db.from('behavior_marks').delete().eq('child_id', family.childId)
    await family.cleanup()
  })

  it('approved-sum: two+ approved marks (incl. one negative-price tag) credit the sum, each its own idempotent source', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const markAId = await insertMark(DATE_APPROVED_SUM, tagAId, 'approved')
    const markBId = await insertMark(DATE_APPROVED_SUM, tagBId, 'approved')

    const res = await postAward(family.childId, DATE_APPROVED_SUM)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('source_id, coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .in('source_id', [markAId, markBId])
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(2)
    const bySource = new Map((txs ?? []).map((t: { source_id: string; coins_change: number }) => [t.source_id, t.coins_change]))
    expect(bySource.get(markAId)).toBe(8)
    expect(bySource.get(markBId)).toBe(-10)

    // Re-POST: idempotent — no double credit, one row per mark id remains.
    const res2 = await postAward(family.childId, DATE_APPROVED_SUM)
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.awards).toBe(0)

    const { data: txsAfter } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .in('source_id', [markAId, markBId])
    expect(txsAfter?.length).toBe(2)
  })

  it('pending marks credit 0', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const markId = await insertMark(DATE_PENDING_ZERO, tagAId, 'pending')

    const res = await postAward(family.childId, DATE_PENDING_ZERO)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(txErr).toBeNull()
    expect(txs?.length ?? 0).toBe(0)
  })

  it('same-tag-twice: two approved marks of the SAME tag credit twice (resolved OQ2 — repeatable marks)', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const mark1 = await insertMark(DATE_SAME_TAG_TWICE, tagAId, 'approved')
    const mark2 = await insertMark(DATE_SAME_TAG_TWICE, tagAId, 'approved')

    const res = await postAward(family.childId, DATE_SAME_TAG_TWICE)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('source_id, coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .in('source_id', [mark1, mark2])
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(2)
    expect(txs?.every((t: { coins_change: number }) => t.coins_change === 8)).toBe(true)
  })

  it('D-09 legacy fallback: ZERO behavior_marks rows + days.good_behavior=true credits coins_per_good_behavior', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const { data: dayRow, error: dayErr } = await db
      .from('days')
      .insert({ child_id: family.childId, date: DATE_LEGACY_FALLBACK_ZERO, good_behavior: true })
      .select('id')
      .single()
    expect(dayErr).toBeNull()

    const { data: marksForDate } = await db
      .from('behavior_marks')
      .select('id')
      .eq('child_id', family.childId)
      .eq('date', DATE_LEGACY_FALLBACK_ZERO)
    expect(marksForDate?.length ?? 0).toBe(0)

    const res = await postAward(family.childId, DATE_LEGACY_FALLBACK_ZERO)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', dayRow!.id)
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0]?.coins_change).toBe(COINS_PER_GOOD_BEHAVIOR)

    // Re-POST idempotent.
    const res2 = await postAward(family.childId, DATE_LEGACY_FALLBACK_ZERO)
    const body2 = await res2.json()
    expect(body2.awards).toBe(0)
  })

  it('no-double-credit: an approved default-tag mark AND days.good_behavior=true credit ONLY the mark price', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const { data: dayRow, error: dayErr } = await db
      .from('days')
      .insert({ child_id: family.childId, date: DATE_NO_DOUBLE_CREDIT, good_behavior: true })
      .select('id')
      .single()
    expect(dayErr).toBeNull()

    const markId = await insertMark(DATE_NO_DOUBLE_CREDIT, defaultTagId, 'approved')

    const res = await postAward(family.childId, DATE_NO_DOUBLE_CREDIT)
    expect(res.status).toBe(200)

    const { data: markTx, error: markTxErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(markTxErr).toBeNull()
    expect(markTx?.length).toBe(1)
    expect(markTx?.[0]?.coins_change).toBe(COINS_PER_GOOD_BEHAVIOR)

    // No SECOND behavior tx keyed by day.id — the legacy fallback must be
    // suppressed because an approved mark exists.
    const { data: dayTx, error: dayTxErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', dayRow!.id)
    expect(dayTxErr).toBeNull()
    expect(dayTx?.length ?? 0).toBe(0)
  })

  it('pending-only fallback: only a PENDING mark exists + days.good_behavior=true STILL credits the legacy path', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const { data: dayRow, error: dayErr } = await db
      .from('days')
      .insert({ child_id: family.childId, date: DATE_PENDING_ONLY_FALLBACK, good_behavior: true })
      .select('id')
      .single()
    expect(dayErr).toBeNull()

    const markId = await insertMark(DATE_PENDING_ONLY_FALLBACK, tagAId, 'pending')

    const res = await postAward(family.childId, DATE_PENDING_ONLY_FALLBACK)
    expect(res.status).toBe(200)

    const { data: dayTx, error: dayTxErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', dayRow!.id)
    expect(dayTxErr).toBeNull()
    expect(dayTx?.length).toBe(1)
    expect(dayTx?.[0]?.coins_change).toBe(COINS_PER_GOOD_BEHAVIOR)

    // The pending mark itself credits nothing.
    const { data: markTx } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(markTx?.length ?? 0).toBe(0)

    // Re-POST idempotent.
    const res2 = await postAward(family.childId, DATE_PENDING_ONLY_FALLBACK)
    const body2 = await res2.json()
    expect(body2.awards).toBe(0)
  })

  it('rejected-only fallback: only a REJECTED mark exists + days.good_behavior=true STILL credits the legacy path', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const { data: dayRow, error: dayErr } = await db
      .from('days')
      .insert({ child_id: family.childId, date: DATE_REJECTED_ONLY_FALLBACK, good_behavior: true })
      .select('id')
      .single()
    expect(dayErr).toBeNull()

    const markId = await insertMark(DATE_REJECTED_ONLY_FALLBACK, tagAId, 'rejected')

    const res = await postAward(family.childId, DATE_REJECTED_ONLY_FALLBACK)
    expect(res.status).toBe(200)

    const { data: dayTx, error: dayTxErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', dayRow!.id)
    expect(dayTxErr).toBeNull()
    expect(dayTx?.length).toBe(1)
    expect(dayTx?.[0]?.coins_change).toBe(COINS_PER_GOOD_BEHAVIOR)

    // The rejected mark itself credits nothing.
    const { data: markTx } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(markTx?.length ?? 0).toBe(0)

    // Re-POST idempotent.
    const res2 = await postAward(family.childId, DATE_REJECTED_ONLY_FALLBACK)
    const body2 = await res2.json()
    expect(body2.awards).toBe(0)
  })

  it('teardown removes all behavior_marks/behavior_tags/wallet_transactions for the test child', async () => {
    await db.from('behavior_marks').delete().eq('child_id', family.childId)
    await destroyTestFamily(family.familyId, family.childId)

    const { data: remainingMarks, error: marksErr } = await db
      .from('behavior_marks')
      .select('id')
      .eq('child_id', family.childId)
    expect(marksErr).toBeNull()
    expect(remainingMarks?.length ?? 0).toBe(0)

    const { data: remainingTags, error: tagsErr } = await db
      .from('behavior_tags')
      .select('id')
      .eq('family_id', family.familyId)
    expect(tagsErr).toBeNull()
    expect(remainingTags?.length ?? 0).toBe(0)

    const { data: remainingTx, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
    expect(txErr).toBeNull()
    expect(remainingTx?.length ?? 0).toBe(0)
  })
})
