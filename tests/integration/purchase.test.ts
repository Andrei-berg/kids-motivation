// tests/integration/purchase.test.ts
// Integration coverage for the reward-purchase flow against the LIVE Supabase
// DB (service-role key): request (deduct-at-request + pending), insufficient
// coins, approve (no double-deduct), reject (refund), and the non-pending
// guard on the parent shop actions.
//
// Auth is mocked at the requireFamilyMember()/requireParent() boundary (this
// suite invokes the purchase route handler and the shop server actions
// directly, in-process) — everything below that (createAdminClient,
// assertChildInFamily, processPurchase, adjustCoins, wallet_apply) runs for
// real against a dedicated __test__ family created/torn down by
// tests/integration/family-fixture.ts. Push notifications and audit-event
// inserts are mocked to no-ops so the suite never sends real pushes or writes
// real audit rows. describe.skipIf keeps `npm test` green without integration
// env keys.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  destroyTestFamily,
  type TestFamily,
} from './family-fixture'

// requireFamilyMember (purchase route) and requireParent (shop actions) are
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

// vi.mock calls are hoisted above imports by vitest, so these static imports
// resolve against the mocked '@/lib/supabase/admin' / push / audit modules.
import { POST } from '@/app/api/wallet/purchase/route'
import { approvePurchaseAction, rejectPurchaseAction } from '@/app/parent/shop/actions'

function postPurchase(childId: string, rewardId: string) {
  const req = new NextRequest('http://localhost/api/wallet/purchase', {
    method: 'POST',
    body: JSON.stringify({ childId, rewardId }),
  })
  return POST(req)
}

describe.skipIf(!hasIntegrationEnv)('Purchase flow — request/approve/reject — integration', () => {
  let family: TestFamily
  const db = hasIntegrationEnv ? serviceClient() : null!

  // rewardId for the 40-coin reward used across the request/approve/reject
  // flow; rewardId for the over-priced reward used by the insufficient test.
  let cheapRewardId: string
  let pricyRewardId: string

  // Purchase ids threaded across tests to exercise approve/reject/guard.
  let requestPurchaseId: string
  let secondRequestPurchaseId: string

  beforeAll(async () => {
    family = await createTestFamily()

    // Seed the wallet to a known starting balance (fixture creates it at 0).
    const { error } = await db.from('wallet').update({ coins: 100 }).eq('child_id', family.childId)
    expect(error).toBeNull()

    const { data: cheap, error: cheapErr } = await db
      .from('rewards')
      .insert({
        family_id: family.familyId,
        title: '__test__ cheap reward',
        icon: '🎁',
        reward_type: 'coins',
        price_coins: 40,
        is_active: true,
        auto_approve: false,
      })
      .select('id')
      .single()
    expect(cheapErr).toBeNull()
    cheapRewardId = cheap!.id

    const { data: pricy, error: pricyErr } = await db
      .from('rewards')
      .insert({
        family_id: family.familyId,
        title: '__test__ pricy reward',
        icon: '💎',
        reward_type: 'coins',
        price_coins: 1000,
        is_active: true,
        auto_approve: false,
      })
      .select('id')
      .single()
    expect(pricyErr).toBeNull()
    pricyRewardId = pricy!.id
  })

  afterAll(async () => {
    // Best-effort: reward rows are family-scoped and removed by
    // destroyTestFamily's `rewards` delete; this is a safety net if an
    // earlier assertion throws before that runs.
    await db.from('rewards').delete().eq('family_id', family.familyId)
    await destroyTestFamily(family.familyId, family.childId)
  })

  it('request deducts coins immediately and lands as pending', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-child',
      familyId: family.familyId,
      role: 'child',
      childId: family.childId,
    })

    const res = await postPurchase(family.childId, cheapRewardId)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.purchase.status).toBe('pending')
    expect(body.purchase.frozen_coins).toBe(0)
    requestPurchaseId = body.purchase.id

    const { data: wallet, error: walletErr } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    expect(walletErr).toBeNull()
    expect(wallet?.coins).toBe(60)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change, transaction_type, related_id')
      .eq('child_id', family.childId)
      .eq('transaction_type', 'spend_coins')
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0].coins_change).toBe(-40)
    expect(txs?.[0].related_id).toBe(requestPurchaseId)
  })

  it('insufficient coins: request is rejected with 400, no purchase row, balance unchanged', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-child',
      familyId: family.familyId,
      role: 'child',
      childId: family.childId,
    })

    const res = await postPurchase(family.childId, pricyRewardId)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Insufficient coins')

    const { data: wallet } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    expect(wallet?.coins).toBe(60)

    const { data: purchases, error } = await db
      .from('reward_purchases')
      .select('id')
      .eq('reward_id', pricyRewardId)
    expect(error).toBeNull()
    expect(purchases?.length ?? 0).toBe(0)
  })

  it('approve keeps the deduction — no double-deduct on the frozen_coins=0 path', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const purchase = await approvePurchaseAction(requestPurchaseId)
    expect(purchase.status).toBe('approved')
    expect(purchase.processed_by).toBe('parent')

    const { data: wallet } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    // Still 60 — frozen_coins was 0 at request time, so approve does not
    // deduct a second time.
    expect(wallet?.coins).toBe(60)
  })

  it('reject refunds the coins', async () => {
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-child',
      familyId: family.familyId,
      role: 'child',
      childId: family.childId,
    })

    const res = await postPurchase(family.childId, cheapRewardId)
    expect(res.status).toBe(200)
    const body = await res.json()
    secondRequestPurchaseId = body.purchase.id

    const { data: walletAfterRequest } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    expect(walletAfterRequest?.coins).toBe(20)

    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const rejected = await rejectPurchaseAction(secondRequestPurchaseId)
    expect(rejected.status).toBe('rejected')

    const { data: walletAfterReject } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .single()
    expect(walletAfterReject?.coins).toBe(60)

    const { data: refundTxs, error } = await db
      .from('wallet_transactions')
      .select('coins_change')
      .eq('child_id', family.childId)
      .eq('transaction_type', 'earn_coins')
      .eq('related_id', secondRequestPurchaseId)
    expect(error).toBeNull()
    expect(refundTxs?.length).toBe(1)
    expect(refundTxs?.[0].coins_change).toBe(40)
  })

  it('non-pending guard: approving an already-approved purchase throws', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    await expect(approvePurchaseAction(requestPurchaseId)).rejects.toThrow('Purchase is not pending')
  })

  it('teardown removes all reward_purchases/wallet_transactions for the test child', async () => {
    await db.from('rewards').delete().eq('family_id', family.familyId)
    await destroyTestFamily(family.familyId, family.childId)

    const { data: remainingPurchases, error: purchErr } = await db
      .from('reward_purchases')
      .select('id')
      .eq('child_id', family.childId)
    expect(purchErr).toBeNull()
    expect(remainingPurchases?.length ?? 0).toBe(0)

    const { data: remainingTxs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
    expect(txErr).toBeNull()
    expect(remainingTxs?.length ?? 0).toBe(0)
  })
})
