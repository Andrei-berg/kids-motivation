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
// KNOWN GAP (2026-07-06): there is no server-side withdrawal-approval
// endpoint. app/api/wallet/withdraw/route.ts's header comment references
// /api/wallet/withdraw/approve, but that route does not exist anywhere in
// app/ (verified 2026-07-06) — the only candidate, approveWithdrawal/
// rejectWithdrawal in lib/repositories/wallet.repo.ts, is dead code on the
// anon client and would fail under the 04.4-03 money-table RLS lock. As a
// result, pending withdrawals do NOT reserve funds: the request route only
// checks the child's CURRENT balance, so nothing stops a second (or third)
// withdrawal request from being created against a balance already "spoken
// for" by an earlier pending request. Test 6 below documents this current
// behavior rather than testing a non-existent double-approve guard. Building
// the approval endpoint (with its own auth guard + threat model) is deferred
// to a dedicated plan — see STATE.md Blockers.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  destroyTestFamily,
  type TestFamily,
} from './family-fixture'

// requireFamilyMember is the only thing this suite mocks — set once in
// beforeAll to the test family's parent membership. Everything else in
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

// vi.mock calls are hoisted above imports by vitest, so these static imports
// resolve against the mocked '@/lib/supabase/admin'.
import { POST as exchangePOST } from '@/app/api/wallet/exchange/route'
import { POST as withdrawPOST } from '@/app/api/wallet/withdraw/route'

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

describe.skipIf(!hasIntegrationEnv)('Exchange + withdrawal — integration', () => {
  let family: TestFamily
  const db = hasIntegrationEnv ? serviceClient() : null!

  beforeAll(async () => {
    family = await createTestFamily()

    mockRequireFamilyMember.mockResolvedValue({
      userId: 'test-user-parent',
      familyId: family.familyId,
      role: 'parent',
      childId: null,
    })

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

  it('KNOWN GAP: a second withdraw request succeeds against an unchanged balance — pending withdrawals do not reserve funds', async () => {
    // Money is still 550 and the Test-4 pending withdrawal of 200 is still
    // open. The route checks only the CURRENT wallet balance, not balance
    // minus already-pending withdrawals, so a second request for 400 (which
    // together with the first pending 200 would overdraw the 550 balance if
    // both were ever approved) is accepted anyway.
    const res = await postWithdraw(family.childId, 400)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

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
    // Still 550 — no deduction happened for either pending request.
    expect(Number(wallet?.money)).toBe(550)
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
