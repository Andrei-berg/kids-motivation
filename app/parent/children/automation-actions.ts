'use server'

// Parent-guarded, server-role writes for the two per-child automation
// settings (05.10): trust-limit auto-approve threshold (SC2) and allowance
// amount/period/anchor (SC1). Both persist to ordinary `children` columns
// (not money tables) but still go through the service-role client behind a
// parent guard — never a client-side write (T-0510-14, T-0510-15).
//
// Numeric inputs are clamped server-side (T-0510-13) via automation-clamp.ts
// before every write, independent of whatever the UI already constrains.

import { createAdminClient, requireParent, assertChildInFamily } from '@/lib/supabase/admin'
import { clampTrustLimit, clampAllowance, type AllowancePeriod } from './automation-clamp'

/** Per-child trust limit: purchases priced at/under this auto-approve (0 = off, D-04). */
export async function setTrustLimitAction(childId: string, value: number): Promise<{ ok: true }> {
  const member = await requireParent()
  const admin = createAdminClient()
  await assertChildInFamily(admin, childId, member.familyId)

  const trustLimitCoins = clampTrustLimit(value)
  await admin.from('children').update({ trust_limit_coins: trustLimitCoins }).eq('id', childId)
  return { ok: true }
}

/** Per-child allowance: amount + period (weekly/monthly) + anchor (dow/dom). period=null turns it off (D-08). */
export async function setAllowanceAction(
  childId: string,
  amount: number,
  period: AllowancePeriod,
  anchor: number | null,
): Promise<{ ok: true }> {
  const member = await requireParent()
  const admin = createAdminClient()
  await assertChildInFamily(admin, childId, member.familyId)

  const clamped = clampAllowance(amount, period, anchor)
  await admin.from('children').update({
    allowance_amount: clamped.amount,
    allowance_period: clamped.period,
    allowance_anchor: clamped.anchor,
  }).eq('id', childId)
  return { ok: true }
}
