// tests/integration/automation-settings-persistence.test.ts
// Closes the 05.10-HUMAN-UAT.md persistence-related items by exercising the
// REAL server actions (setTrustLimitAction / setAllowanceAction) against the
// LIVE Supabase DB — not a raw `children` table update, which is how
// purchase.test.ts and allowance.test.ts seed trust_limit/allowance today.
// That existing coverage proves the auto-approve ENGINE and the allowance
// CRON are correct; it never proves the Settings UI's own write path
// (requireParent guard + clamp + persistence) actually works. This suite
// calls the exact functions Settings.tsx/AutomationCards.tsx call on save,
// then re-reads via a fresh service-role select (the "reload the tab"
// persistence check from 05.10-HUMAN-UAT.md items 1 and 4), then re-uses the
// existing purchase-route pattern to confirm the resulting behavior
// (auto-approve label, default-off enforcement — items 2 and 3).
//
// Auth is mocked at the requireFamilyMember()/requireParent() boundary only
// (same pattern as purchase.test.ts) — assertChildInFamily, the clamp
// functions, and every DB write below run for real against a dedicated
// __test__ family. describe.skipIf keeps `npm test` green without
// integration env keys.

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
const mockRequireParent = vi.fn()

vi.mock('@/lib/supabase/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/admin')>()
  return {
    ...actual,
    requireFamilyMember: () => mockRequireFamilyMember(),
    requireParent: () => mockRequireParent(),
  }
})

vi.mock('@/app/actions/push-notifications', () => ({
  notifyChild: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/repositories/audit.repo', () => ({
  insertAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

// vi.mock calls are hoisted above imports by vitest, so these static imports
// resolve against the mocked '@/lib/supabase/admin' / push / audit modules.
import { setTrustLimitAction, setAllowanceAction } from '@/app/parent/children/automation-actions'
import { POST } from '@/app/api/wallet/purchase/route'

function postPurchase(childId: string, rewardId: string) {
  const req = new NextRequest('http://localhost/api/wallet/purchase', {
    method: 'POST',
    body: JSON.stringify({ childId, rewardId }),
  })
  return POST(req)
}

describe.skipIf(!hasIntegrationEnv)('Automation settings — real server-action persistence (05.10-HUMAN-UAT)', () => {
  let family: TestFamily
  const db = hasIntegrationEnv ? serviceClient() : null!

  beforeAll(async () => {
    family = await createTestFamily()
    const { error } = await db.from('wallet').update({ coins: 1000 }).eq('child_id', family.childId)
    expect(error).toBeNull()
  })

  afterAll(async () => {
    await db.from('rewards').delete().eq('family_id', family.familyId)
    await destroyTestFamily(family.familyId, family.childId)
  })

  async function makeReward(priceCoins: number, autoApprove: boolean, title: string): Promise<string> {
    const { data, error } = await db
      .from('rewards')
      .insert({
        family_id: family.familyId,
        title,
        icon: '🎁',
        reward_type: 'coins',
        price_coins: priceCoins,
        is_active: true,
        auto_approve: autoApprove,
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    return data!.id as string
  }

  it('UAT-1: setTrustLimitAction (real action, parent-guarded) persists — a fresh read after "reload" shows the saved value', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const result = await setTrustLimitAction(family.childId, 30)
    expect(result).toEqual({ ok: true })

    // Simulates "reload the tab": a brand-new read, not the write's own echo.
    const { data, error } = await db.from('children').select('trust_limit_coins').eq('id', family.childId).single()
    expect(error).toBeNull()
    expect(data!.trust_limit_coins).toBe(30)
  })

  it('UAT-2: a purchase saved via the real trust-limit action auto-approves and the journal carries the exact expected label', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })
    await setTrustLimitAction(family.childId, 30)

    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-child',
      familyId: family.familyId,
      role: 'child',
      childId: family.childId,
    })
    const rewardId = await makeReward(20, false, '__test__ UAT trust sub-limit')

    const res = await postPurchase(family.childId, rewardId)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.purchase.status).toBe('approved')
    expect(body.purchase.processed_by).toBe('auto_trust')

    const { data: txs, error } = await db
      .from('wallet_transactions')
      .select('description')
      .eq('child_id', family.childId)
      .eq('related_id', body.purchase.id)
    expect(error).toBeNull()
    // Exact suffix from the checkpoint wording, not just a loose substring.
    expect(txs?.[0]?.description as string).toMatch(/· авто \(лимит доверия\)$/)
  })

  it('UAT-3: setting the trust limit back to 0 via the real action persists and a new sub-threshold purchase goes to pending', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })
    const result = await setTrustLimitAction(family.childId, 0)
    expect(result).toEqual({ ok: true })

    const { data, error } = await db.from('children').select('trust_limit_coins').eq('id', family.childId).single()
    expect(error).toBeNull()
    expect(data!.trust_limit_coins).toBe(0)

    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-child',
      familyId: family.familyId,
      role: 'child',
      childId: family.childId,
    })
    const rewardId = await makeReward(10, false, '__test__ UAT trust default-off')

    const res = await postPurchase(family.childId, rewardId)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.purchase.status).toBe('pending')
  })

  it('UAT-4 (persistence half): setAllowanceAction (real action, parent-guarded) persists amount/period/anchor after "reload"', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    const result = await setAllowanceAction(family.childId, 75, 'weekly', 3)
    expect(result).toEqual({ ok: true })

    const { data, error } = await db
      .from('children')
      .select('allowance_amount, allowance_period, allowance_anchor')
      .eq('id', family.childId)
      .single()
    expect(error).toBeNull()
    expect(data!.allowance_amount).toBe(75)
    expect(data!.allowance_period).toBe('weekly')
    expect(data!.allowance_anchor).toBe(3)

    // Turning it off (period: null) is the plan's D-08 "on/off only" switch —
    // confirm the real action persists that too, not just a positive config.
    const off = await setAllowanceAction(family.childId, 75, null, null)
    expect(off).toEqual({ ok: true })
    const { data: dataOff, error: errorOff } = await db
      .from('children')
      .select('allowance_period')
      .eq('id', family.childId)
      .single()
    expect(errorOff).toBeNull()
    expect(dataOff!.allowance_period).toBeNull()
  })

  it('UAT: a tampered/out-of-range payload is still clamped when it reaches the real action (not just the pure clamp unit tests)', async () => {
    mockRequireParent.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

    await setTrustLimitAction(family.childId, -50)
    const { data: trust } = await db.from('children').select('trust_limit_coins').eq('id', family.childId).single()
    expect(trust!.trust_limit_coins).toBe(0)

    await setAllowanceAction(family.childId, -10, 'monthly', 999)
    const { data: allowance } = await db
      .from('children')
      .select('allowance_amount, allowance_anchor')
      .eq('id', family.childId)
      .single()
    expect(allowance!.allowance_amount).toBe(0)
    expect(allowance!.allowance_anchor).toBeLessThanOrEqual(31)
  })
})
