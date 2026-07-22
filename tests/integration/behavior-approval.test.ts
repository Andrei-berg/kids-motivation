// tests/integration/behavior-approval.test.ts
// Integration coverage for the behavior-mark propose→approve→credit boundary
// (Phase 5.9 Plan 07) against the LIVE Supabase DB (service-role key):
// approveBehaviorMark/rejectBehaviorMark/applyTagDirect server actions, plus
// /api/wallet/award crediting.
//
// Auth is mocked at the requireFamilyMember()/requireParent() boundary (this
// suite invokes the award route handler and the behavior server actions
// directly, in-process) — everything below that (createAdminClient,
// assertChildInFamily, creditAwards, pushBehaviorMarkIntents) runs for real
// against a dedicated __test__ family created/torn down by
// tests/integration/family-fixture.ts. Push notifications and audit-event
// inserts are mocked to no-ops so the suite never sends real pushes or writes
// real audit rows. describe.skipIf keeps `npm test` green without
// integration env keys. Modeled on tests/integration/purchase.test.ts
// (approve/reject shape) and tests/integration/behavior-award.test.ts
// (behavior_marks fixture shape).

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  destroyTestFamily,
  type TestFamily,
} from './family-fixture'

// requireFamilyMember (award route) and requireParent (behavior actions) are
// the only things this suite mocks — set per-test via
// mockRequireFamilyMember/mockRequireParent.mockResolvedValue(...).
// Everything else in '@/lib/supabase/admin' is the real implementation.
const mockRequireFamilyMember = vi.fn()
const mockRequireParent = vi.fn()

vi.mock('@/lib/supabase/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/admin')>()
  return {
    ...actual,
    requireFamilyMember: () => mockRequireFamilyMember(),
    requireParent: () => mockRequireParent(),
  }
})

// Push and audit are real side-effect channels (real device pushes, real
// audit-log rows) — mocked to no-ops so this suite never fires either.
vi.mock('@/app/actions/push-notifications', () => ({
  notifyChild: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/repositories/audit.repo', () => ({
  insertAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

// The award route transitively imports lib/services/streaks.service, which
// imports the anon browser singleton in lib/supabase.ts — a module that
// THROWS at import time when NEXT_PUBLIC_SUPABASE_URL is absent. Mock it so
// this suite still loads (and skipIf-skips) without integration env,
// mirroring behavior-award.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// vi.mock calls are hoisted above imports by vitest, so these static imports
// resolve against the mocked '@/lib/supabase/admin' / push / audit modules.
import { POST } from '@/app/api/wallet/award/route'
import { approveBehaviorMark, rejectBehaviorMark, applyTagDirect } from '@/app/parent/behavior/actions'
import { AuthError } from '@/lib/supabase/admin'

const PARENT_MEMBERSHIP = (familyId: string) => ({
  userId: 'test-user-parent',
  familyId,
  role: 'parent' as const,
  childId: null,
})

function postAward(childId: string, date: string) {
  const req = new NextRequest('http://localhost/api/wallet/award', {
    method: 'POST',
    body: JSON.stringify({ childId, date }),
  })
  return POST(req)
}

describe.skipIf(!hasIntegrationEnv)('Behavior mark approve/reject — propose→approve→credit boundary — integration', () => {
  let family: TestFamily
  let tagId: string // custom tag, positive price
  let chainedMarkId: string // threaded across cases 1-3 (propose -> approve -> credit)
  const db = hasIntegrationEnv ? serviceClient() : null!

  const DATE_APPROVE_FLOW = '2021-06-01' // cases 1-3: propose -> approve -> credit, chained
  const DATE_CHILD_GUARD = '2021-06-02' // case 4: self-approval refusal
  const DATE_REJECT_FLOW = '2021-06-03' // case 5: reject never credits
  const DATE_DIRECT_APPLY = '2021-06-04' // case 6: applyTagDirect credits immediately

  async function insertMark(date: string, status: 'pending' | 'approved' | 'rejected') {
    const { data, error } = await db
      .from('behavior_marks')
      .insert({
        child_id: family.childId,
        family_id: family.familyId,
        date,
        tag_id: tagId,
        status,
        proposed_by: 'test-user-child',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    return data!.id as string
  }

  async function walletCoins(): Promise<number> {
    const { data } = await db.from('wallet').select('coins').eq('child_id', family.childId).single()
    return data?.coins ?? 0
  }

  beforeAll(async () => {
    family = await createTestFamily()

    const { data: tag, error: tagErr } = await db
      .from('behavior_tags')
      .insert({ family_id: family.familyId, name: 'Helped sibling', icon: '🤝', price: 8 })
      .select('id')
      .single()
    expect(tagErr).toBeNull()
    tagId = tag!.id
  })

  afterAll(async () => {
    // Safety net if the teardown test below fails early. Idempotent.
    await db.from('behavior_marks').delete().eq('child_id', family.childId)
    await family.cleanup()
  })

  it('case 1: a child-proposed pending mark credits 0 on award POST', async () => {
    mockRequireFamilyMember.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))

    const markId = await insertMark(DATE_APPROVE_FLOW, 'pending')

    const res = await postAward(family.childId, DATE_APPROVE_FLOW)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(txErr).toBeNull()
    expect(txs?.length ?? 0).toBe(0)

    chainedMarkId = markId
  })

  it('case 2: approveBehaviorMark flips status to approved and moves NO coins itself', async () => {
    mockRequireParent.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))

    const markId = chainedMarkId
    const coinsBefore = await walletCoins()

    const mark = await approveBehaviorMark(markId)
    expect(mark.status).toBe('approved')
    expect(mark.decided_by).toBe('test-user-parent')

    const coinsAfter = await walletCoins()
    expect(coinsAfter).toBe(coinsBefore)

    // No wallet_transactions row exists yet — approve alone credits nothing.
    const { data: txs } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(txs?.length ?? 0).toBe(0)
  })

  it('case 3: the NEXT award POST credits the tag price exactly once; re-POST is idempotent', async () => {
    mockRequireFamilyMember.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))

    const markId = chainedMarkId
    const coinsBefore = await walletCoins()

    const res = await postAward(family.childId, DATE_APPROVE_FLOW)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0]?.coins_change).toBe(8)

    const coinsAfter = await walletCoins()
    expect(coinsAfter).toBe(coinsBefore + 8)

    // Re-POST: idempotent — no double credit, one row per mark id remains.
    const res2 = await postAward(family.childId, DATE_APPROVE_FLOW)
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.awards).toBe(0)

    const { data: txsAfter } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(txsAfter?.length).toBe(1)

    const coinsFinal = await walletCoins()
    expect(coinsFinal).toBe(coinsAfter)
  })

  it('case 4: a child-role membership cannot self-approve (T-059-01)', async () => {
    const markId = await insertMark(DATE_CHILD_GUARD, 'pending')

    // requireParent() throws AuthError(403) for a non-parent caller — mocked
    // here at the boundary this suite mocks (mirrors purchase.test.ts's
    // requireParent-boundary mocking; a real child-role JWT would hit the
    // same AuthError inside requireParent's own role check).
    mockRequireParent.mockRejectedValueOnce(new AuthError('Parent role required', 403))

    await expect(approveBehaviorMark(markId)).rejects.toThrow('Parent role required')

    // The mark is untouched — still pending.
    const { data: mark } = await db.from('behavior_marks').select('status').eq('id', markId).single()
    expect(mark?.status).toBe('pending')
  })

  it('case 5: rejectBehaviorMark flips to rejected and the mark never credits', async () => {
    mockRequireParent.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))

    const markId = await insertMark(DATE_REJECT_FLOW, 'pending')

    const rejected = await rejectBehaviorMark(markId)
    expect(rejected.status).toBe('rejected')

    mockRequireFamilyMember.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))
    const res = await postAward(family.childId, DATE_REJECT_FLOW)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', markId)
    expect(txErr).toBeNull()
    expect(txs?.length ?? 0).toBe(0)

    // Non-pending guard: rejecting an already-rejected mark throws.
    await expect(rejectBehaviorMark(markId)).rejects.toThrow('Behavior mark is not pending')
  })

  it('case 6: applyTagDirect (parent) inserts an approved mark the next award POST credits immediately', async () => {
    mockRequireParent.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))

    const mark = await applyTagDirect(family.childId, DATE_DIRECT_APPLY, tagId)
    expect(mark.status).toBe('approved')
    expect(mark.proposed_by).toBe('test-user-parent')
    expect(mark.decided_by).toBe('test-user-parent')

    const coinsBefore = await walletCoins()

    mockRequireFamilyMember.mockResolvedValue(PARENT_MEMBERSHIP(family.familyId))
    const res = await postAward(family.childId, DATE_DIRECT_APPLY)
    expect(res.status).toBe(200)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('source_type', 'behavior')
      .eq('source_id', mark.id)
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0]?.coins_change).toBe(8)

    const coinsAfter = await walletCoins()
    expect(coinsAfter).toBe(coinsBefore + 8)
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
