// app/parent/children/automation-clamp.ts
//
// Pure, side-effect-free clamp helpers for the per-child automation settings
// (trust-limit auto-approve threshold + allowance amount/period/anchor).
//
// Kept in a separate module (not the 'use server' automation-actions.ts file)
// because Next.js Server Action files may only export async functions — a
// plain synchronous export like clampTrustLimit would fail the build. See
// app/parent/reading/actions.ts / app/parent/behavior/actions.ts etc. for the
// existing "every export is async" convention this preserves.
//
// Defense-in-depth (threat T-0510-13): these run server-side inside
// setTrustLimitAction/setAllowanceAction on every write, independent of any
// client-side input constraint (min/max on the number input, select options).

/** Integer coins, 0..100000. NaN/negative/fractional inputs are sanitized, not rejected. */
export function clampTrustLimit(value: unknown): number {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.min(100000, Math.max(0, Math.floor(n)))
}

export type AllowancePeriod = 'weekly' | 'monthly' | null

export type ClampedAllowance = {
  amount: number | null
  period: AllowancePeriod
  anchor: number | null
}

/**
 * Validates period is exactly 'weekly' | 'monthly' (anything else forces the
 * whole allowance off — D-08: no partial/garbage state, amount+anchor always
 * travel with period). Weekly anchor clamps to 1-7 (day of week), monthly to
 * 1-31 (day of month). Amount floors at >= 0.
 */
export function clampAllowance(amount: unknown, period: unknown, anchor: unknown): ClampedAllowance {
  const safePeriod: AllowancePeriod = period === 'weekly' || period === 'monthly' ? period : null

  if (safePeriod === null) {
    return { amount: null, period: null, anchor: null }
  }

  const rawAmount = Number(amount)
  const safeAmount = Math.min(100000, Math.max(0, Math.floor(Number.isNaN(rawAmount) ? 0 : rawAmount)))

  const anchorMax = safePeriod === 'weekly' ? 7 : 31
  const rawAnchor = Number(anchor)
  const safeAnchor = Math.min(anchorMax, Math.max(1, Math.floor(Number.isNaN(rawAnchor) ? 1 : rawAnchor)))

  return { amount: safeAmount, period: safePeriod, anchor: safeAnchor }
}
