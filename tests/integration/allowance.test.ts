// tests/integration/allowance.test.ts
// Integration coverage for the scheduled allowance pass folded into
// GET /api/cron/daily (05.10-03, SC1) — asserts credit-once-per-period
// idempotency (D-09) and that a child with no allowance_period configured is
// never credited (D-08), against the LIVE Supabase DB (service-role key).
// sendPushToSubscription is mocked to a no-op so this suite never sends a
// real push (same T-0510-06 guard as reminders-daily.test.ts).

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  type TestFamily,
} from './family-fixture'

const mockSendPush = vi.fn().mockResolvedValue(undefined)
vi.mock('@/app/actions/push', () => ({
  sendPushToSubscription: (...args: unknown[]) => mockSendPush(...args),
}))

// lib/services/streaks.service.ts (imported transitively via getStreaksAtRisk)
// imports the anon browser singleton at module scope, which throws when
// NEXT_PUBLIC_SUPABASE_URL is absent — mock it inert so this suite loads (and
// skip-ifs cleanly) without integration env, same pattern as award.test.ts /
// reminders-daily.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// vi.mock calls are hoisted above imports by vitest, so this static import
// resolves against the mocked modules above.
import { GET } from '@/app/api/cron/daily/route'

function getDaily(bearer?: string) {
  const headers: Record<string, string> = {}
  if (bearer !== undefined) headers['authorization'] = bearer
  const req = new NextRequest('http://localhost/api/cron/daily', { headers })
  return GET(req)
}

// Mirrors the route's own day-of-week mapping (JS Sunday=0 -> ISO 7).
function todayIsoDow(): number {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
}

describe.skipIf(!hasIntegrationEnv)('GET /api/cron/daily — allowance (SC1)', () => {
  let family: TestFamily
  let noAllowanceFamily: TestFamily
  let memberId: string
  let noAllowanceMemberId: string
  const db = hasIntegrationEnv ? serviceClient() : null!
  const ORIGINAL_SECRET = process.env.CRON_SECRET

  beforeAll(async () => {
    process.env.CRON_SECRET = 'test-cron-secret'

    // Eligible child: weekly allowance anchored on today's ISO day-of-week.
    family = await createTestFamily()
    await db
      .from('children')
      .update({ allowance_amount: 50, allowance_period: 'weekly', allowance_anchor: todayIsoDow() })
      .eq('id', family.childId)
    const { data: member, error } = await db
      .from('family_members')
      .insert({
        family_id: family.familyId,
        role: 'child',
        child_id: family.childId,
        display_name: '__test__ allowance child',
      })
      .select('id')
      .single()
    if (error || !member) {
      throw new Error(`family_members insert failed: ${error?.message ?? 'no data'}`)
    }
    memberId = member.id as string

    // Control child: allowance_period left null (default) — must never be credited.
    noAllowanceFamily = await createTestFamily()
    const { data: noAllowanceMember, error: noAllowanceErr } = await db
      .from('family_members')
      .insert({
        family_id: noAllowanceFamily.familyId,
        role: 'child',
        child_id: noAllowanceFamily.childId,
        display_name: '__test__ no-allowance child',
      })
      .select('id')
      .single()
    if (noAllowanceErr || !noAllowanceMember) {
      throw new Error(`family_members insert failed: ${noAllowanceErr?.message ?? 'no data'}`)
    }
    noAllowanceMemberId = noAllowanceMember.id as string
  })

  afterAll(async () => {
    process.env.CRON_SECRET = ORIGINAL_SECRET
    if (memberId) await db.from('family_members').delete().eq('id', memberId)
    if (noAllowanceMemberId) await db.from('family_members').delete().eq('id', noAllowanceMemberId)
    await family.cleanup()
    await noAllowanceFamily.cleanup()
  })

  it('credits the eligible child exactly once across two GET invocations for the same period', async () => {
    mockSendPush.mockClear()

    const res1 = await getDaily('Bearer test-cron-secret')
    expect(res1.status).toBe(200)
    const body1 = await res1.json()
    expect(body1.allowanceCredited).toBeGreaterThanOrEqual(1)

    const res2 = await getDaily('Bearer test-cron-secret')
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    // Re-running the cron for the same period must never double-credit
    // (D-09) — the second run should see zero NEW allowance credits for
    // this child (other real children with distinct schedules may still
    // credit on either run, hence checking the wallet directly below
    // rather than asserting body2.allowanceCredited === 0).

    const { data: txRows, error: txErr } = await db
      .from('wallet_transactions')
      .select('id, coins_change, source_id')
      .eq('child_id', family.childId)
      .eq('source_type', 'allowance')
    expect(txErr).toBeNull()
    expect(txRows).toHaveLength(1)
    expect(txRows![0].coins_change).toBe(50)

    const { data: wallet, error: walletErr } = await db
      .from('wallet')
      .select('coins')
      .eq('child_id', family.childId)
      .maybeSingle()
    expect(walletErr).toBeNull()
    expect(wallet!.coins).toBe(50)
  })

  it('never credits a child with allowance_period = null', async () => {
    const res = await getDaily('Bearer test-cron-secret')
    expect(res.status).toBe(200)

    const { data: txRows, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', noAllowanceFamily.childId)
      .eq('source_type', 'allowance')
    expect(txErr).toBeNull()
    expect(txRows).toHaveLength(0)
  })
})
