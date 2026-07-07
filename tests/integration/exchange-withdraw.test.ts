// tests/integration/exchange-withdraw.test.ts
// Integration coverage for coin -> money exchange and cash-withdrawal request
// against the LIVE Supabase DB (service-role key): exchange rate/bonus math,
// overspend guard, input validation, and the withdrawal request path (which
// intentionally does not move money at request time).
//
// Auth is mocked at the requireFamilyMember() boundary (this suite invokes
// the exchange/withdraw route handlers directly, in-process) — everything
// below that (createAdminClient, assertChildInFamily, wallet_apply) runs for
// real against a dedicated __test__ family created/torn down by
// tests/integration/family-fixture.ts. describe.skipIf keeps `npm test`
// green without integration env keys.
//
// Withdrawal lifecycle (closed the 2026-07-06 KNOWN GAP on 2026-07-07):
// requests reserve funds (a new request must fit into money minus the sum of
// already-pending requests) and /api/wallet/withdraw/approve is the only place
// money moves — approve debits atomically via wallet_apply with a 0 floor and
// compensates (reopens the request) if the debit fails; reject closes the
// request without touching the wallet.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  destroyTestFamily,
  type TestFamily,
} from './family-fixture'

// requireFamilyMember/requireParent are the only things this suite mocks —
// set once in beforeAll to the test family's parent membership. Everything
// else in '@/lib/supabase/admin' (createAdminClient, assertChildInFamily,
// AuthError) is the real implementation, running against the live DB.
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
// audit-log rows) — mocked to no-ops so this suite never fires either. The
// audit mock also keeps `npm test` importable without integration env
// (audit.repo pulls in the browser supabase client, which throws without env).
vi.mock('@/app/actions/push-notifications', () => ({
  notifyChild: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/repositories/audit.repo', () => ({
  insertAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

// vi.mock calls are hoisted above imports by vitest, so these static imports
// resolve against the mocked '@/lib/supabase/admin' / push / audit modules.
import { POST as exchangePOST } from '@/app/api/wallet/exchange/route'
import { POST as withdrawPOST } from '@/app/api/wallet/withdraw/route'
import { POST as approvePOST } from '@/app/api/wallet/withdraw/approve/route'

function postExchange(childId: string, coinsAmount: unknown) {
  const req = new NextRequest('http://localhost/api/wallet/exchange', {
    method: 'POST',
    body: JSON.stringify({ childId, coinsAmount }),
  })
  return exchangePOST(req)
}

function postWithdraw(childId: string, amount: unknown) {
  const req = new NextRequest('http://localhost/api/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify({ childId, amount }),
  })
  return withdrawPOST(req)
}

function postDecision(withdrawalId: string, action: string, note?: string) {
  const req = new NextRequest('http://localhost/api/wallet/withdraw/approve', {
    method: 'POST',
    body: JSON.stringify({ withdrawalId, action, note }),
  })
  return approvePOST(req)
}

describe.skipIf(!hasIntegrationEnv)('Exchange + withdrawal — integration', () => {
  let family: TestFamily
  const db = hasIntegrationEnv ? serviceClient() : null!

  beforeAll(async () => {
    family = await createTestFamily()

    const parentMembership = {
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    }
    mockRequireFamilyMember.mockResolvedValue(parentMembership)
    mockRequireParent.mockResolvedValue(parentMembership)

    // Fixture wallet starts at coins:0/money:0 — seed the exchange-math
    // starting balance. No wallet_settings row exists for this family, so
    // loadSettings() falls back to SETTINGS_DEFAULTS (base rate 10, bonus_100 10).
    const { error } = await db
      .from('wallet')
      .update({ coins: 100, money: 0 })
      .eq('child_id', family.childId)
    expect(error).toBeNull()
  })

  afterAll(async () => {
    await destroyTestFamily(family.familyId, family.childId)
  })

  it('exchange math: 50 coins from a 100-coin balance at the >=100 bonus tier', async () => {
    const res = await postExchange(family.childId, 50)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Number(body.exchange.exchange_rate)).toBe(11)
    expect(Number(body.exchange.bonus_rate)).toBe(10)
    expect(Number(body.exchange.money_amount)).toBe(550)

    const { data: wallet, error } = await db
      .from('wallet')
      .select('coins, money')
      .eq('child_id', family.childId)
      .single()
    expect(error).toBeNull()
    expect(wallet?.coins).toBe(50)
    expect(Number(wallet?.money)).toBe(550)

    const { data: exchanges, error: exErr } = await db
      .from('coin_exchanges')
      .select('exchange_rate, bonus_rate')
      .eq('child_id', family.childId)
    expect(exErr).toBeNull()
    expect(exchanges?.length).toBe(1)
    expect(Number(exchanges?.[0].exchange_rate)).toBe(11)
    expect(Number(exchanges?.[0].bonus_rate)).toBe(10)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('coins_change, money_change')
      .eq('child_id', family.childId)
      .eq('transaction_type', 'exchange')
    expect(txErr).toBeNull()
    expect(txs?.length).toBe(1)
    expect(txs?.[0].coins_change).toBe(-50)
    expect(Number(txs?.[0].money_change)).toBe(550)
  })

  it('exchange overspend: 60 coins against a 50-coin balance is rejected, balance unchanged', async () => {
    const res = await postExchange(family.childId, 60)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Insufficient coins')

    const { data: wallet } = await db
      .from('wallet')
      .select('coins, money')
      .eq('child_id', family.childId)
      .single()
    expect(wallet?.coins).toBe(50)
    expect(Number(wallet?.money)).toBe(550)
  })

  it('exchange input validation: zero, negative, and non-integer coinsAmount are all rejected', async () => {
    for (const bad of [0, -5, 1.5]) {
      const res = await postExchange(family.childId, bad)
      expect(res.status).toBe(400)
    }

    const { data: wallet } = await db
      .from('wallet')
      .select('coins, money')
      .eq('child_id', family.childId)
      .single()
    expect(wallet?.coins).toBe(50)
    expect(Number(wallet?.money)).toBe(550)
  })

  it('withdraw request is not a deduction: money balance stays unchanged', async () => {
    const res = await postWithdraw(family.childId, 200)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.withdrawal.child_id).toBe(family.childId)
    expect(Number(body.withdrawal.amount)).toBe(200)

    const { data: wallet } = await db
      .from('wallet')
      .select('money')
      .eq('child_id', family.childId)
      .single()
    // Still 550 — the request route only creates a cash_withdrawals row; it
    // never debits the wallet (approval/deduction has no implemented endpoint,
    // see the KNOWN GAP note at the top of this file).
    expect(Number(wallet?.money)).toBe(550)

    const { data: withdrawals, error } = await db
      .from('cash_withdrawals')
      .select('id')
      .eq('child_id', family.childId)
    expect(error).toBeNull()
    expect(withdrawals?.length).toBe(1)
  })

  it('withdraw insufficient: a request above the current balance is rejected, no row created', async () => {
    const res = await postWithdraw(family.childId, 10000)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Insufficient money')

    const { data: withdrawals, error } = await db
      .from('cash_withdrawals')
      .select('id')
      .eq('child_id', family.childId)
    expect(error).toBeNull()
    expect(withdrawals?.length).toBe(1) // still just the Test 4 row
  })

  it('pending withdrawals reserve funds: a second request that would overdraw the balance together with the pending one is rejected', async () => {
    // Money is 550 and the Test-4 pending withdrawal of 200 is still open.
    // Available = 550 - 200 = 350, so a second request for 400 must be refused
    // even though the raw balance covers it.
    const res = await postWithdraw(family.childId, 400)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Insufficient money')

    // A request that fits into the available remainder is accepted.
    const okRes = await postWithdraw(family.childId, 300)
    expect(okRes.status).toBe(200)

    const { data: withdrawals, error } = await db
      .from('cash_withdrawals')
      .select('id, amount, status')
      .eq('child_id', family.childId)
    expect(error).toBeNull()
    expect(withdrawals?.length).toBe(2)
    expect(withdrawals?.every((w) => w.status === 'pending')).toBe(true)

    const { data: wallet } = await db
      .from('wallet')
      .select('money')
      .eq('child_id', family.childId)
      .single()
    // Still 550 — requests reserve, they never debit.
    expect(Number(wallet?.money)).toBe(550)
  })

  it('approve debits the wallet once: money moves, a withdraw transaction is recorded, and a second approve is a 409', async () => {
    const { data: pending } = await db
      .from('cash_withdrawals')
      .select('id, amount')
      .eq('child_id', family.childId)
      .eq('status', 'pending')
      .order('amount', { ascending: true })
    const w200 = pending?.find((w) => Number(w.amount) === 200)
    expect(w200).toBeDefined()

    const res = await postDecision(w200!.id, 'approve')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.withdrawal.status).toBe('approved')
    expect(Number(body.withdrawal.balance_after_money)).toBe(350)

    const { data: wallet } = await db
      .from('wallet')
      .select('money, total_spent_money')
      .eq('child_id', family.childId)
      .single()
    expect(Number(wallet?.money)).toBe(350)
    expect(Number(wallet?.total_spent_money)).toBe(200)

    const { data: txs } = await db
      .from('wallet_transactions')
      .select('money_change, related_id')
      .eq('child_id', family.childId)
      .eq('transaction_type', 'withdraw')
    expect(txs?.length).toBe(1)
    expect(Number(txs?.[0].money_change)).toBe(-200)
    expect(txs?.[0].related_id).toBe(w200!.id)

    // Double-approve guard: the conditional pending → terminal flip refuses.
    const again = await postDecision(w200!.id, 'approve')
    expect(again.status).toBe(409)
  })

  it('reject closes the request without touching the wallet', async () => {
    const { data: pending } = await db
      .from('cash_withdrawals')
      .select('id, amount')
      .eq('child_id', family.childId)
      .eq('status', 'pending')
    expect(pending?.length).toBe(1) // the 300 from the reservation test

    const res = await postDecision(pending![0].id, 'reject', 'not this week')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.withdrawal.status).toBe('rejected')
    expect(body.withdrawal.note).toBe('not this week')

    const { data: wallet } = await db
      .from('wallet')
      .select('money')
      .eq('child_id', family.childId)
      .single()
    expect(Number(wallet?.money)).toBe(350) // unchanged since the approve test
  })

  it('approve compensates when the debit fails: withdrawal reopens as pending and no money moves', async () => {
    // Create a request that fits the current balance (350), then drain the
    // wallet behind its back so the approval-time atomic debit must fail.
    const reqRes = await postWithdraw(family.childId, 350)
    expect(reqRes.status).toBe(200)
    const { withdrawal } = await reqRes.json()

    const { error: drainErr } = await db
      .from('wallet')
      .update({ money: 100 })
      .eq('child_id', family.childId)
    expect(drainErr).toBeNull()

    const res = await postDecision(withdrawal.id, 'approve')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Insufficient money')

    const { data: reopened } = await db
      .from('cash_withdrawals')
      .select('status, processed_by')
      .eq('id', withdrawal.id)
      .single()
    expect(reopened?.status).toBe('pending')
    expect(reopened?.processed_by).toBeNull()

    const { data: wallet } = await db
      .from('wallet')
      .select('money')
      .eq('child_id', family.childId)
      .single()
    expect(Number(wallet?.money)).toBe(100)
  })

  it('teardown removes all coin_exchanges/cash_withdrawals for the test child', async () => {
    await destroyTestFamily(family.familyId, family.childId)

    const { data: remainingExchanges, error: exErr } = await db
      .from('coin_exchanges')
      .select('id')
      .eq('child_id', family.childId)
    expect(exErr).toBeNull()
    expect(remainingExchanges?.length ?? 0).toBe(0)

    const { data: remainingWithdrawals, error: wErr } = await db
      .from('cash_withdrawals')
      .select('id')
      .eq('child_id', family.childId)
    expect(wErr).toBeNull()
    expect(remainingWithdrawals?.length ?? 0).toBe(0)
  })
})
