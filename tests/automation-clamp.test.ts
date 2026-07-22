// tests/automation-clamp.test.ts
// Unit coverage for the pure server-side clamp helpers behind the trust-limit
// and allowance settings actions (05.10-04, threat T-0510-13). Imports only
// the pure functions from automation-clamp.ts — never automation-actions.ts
// (which is a 'use server' file requiring Supabase/auth context) — so this
// suite has no Supabase/auth dependency and runs everywhere `npm test` does.

import { describe, it, expect } from 'vitest'
import { clampTrustLimit, clampAllowance } from '../app/parent/children/automation-clamp'

describe('clampTrustLimit', () => {
  it('clamps negative to 0', () => {
    expect(clampTrustLimit(-5)).toBe(0)
  })

  it('floors a fractional value', () => {
    expect(clampTrustLimit(3.9)).toBe(3)
  })

  it('drops NaN to 0', () => {
    expect(clampTrustLimit(NaN)).toBe(0)
  })

  it('drops non-numeric strings to 0', () => {
    expect(clampTrustLimit('not-a-number')).toBe(0)
  })

  it('caps an absurdly large value at the sane max', () => {
    expect(clampTrustLimit(500000)).toBe(100000)
  })

  it('accepts an in-range integer unchanged', () => {
    expect(clampTrustLimit(30)).toBe(30)
  })

  it('accepts exactly the max unchanged', () => {
    expect(clampTrustLimit(100000)).toBe(100000)
  })
})

describe('clampAllowance', () => {
  it('period=null forces amount/anchor off too (D-08)', () => {
    expect(clampAllowance(50, null, 3)).toEqual({ amount: null, period: null, anchor: null })
  })

  it('an invalid/garbage period string is treated as off', () => {
    expect(clampAllowance(50, 'yearly', 3)).toEqual({ amount: null, period: null, anchor: null })
  })

  it('weekly anchor clamps into 1-7', () => {
    expect(clampAllowance(50, 'weekly', 9)).toEqual({ amount: 50, period: 'weekly', anchor: 7 })
    expect(clampAllowance(50, 'weekly', 0)).toEqual({ amount: 50, period: 'weekly', anchor: 1 })
    expect(clampAllowance(50, 'weekly', -3)).toEqual({ amount: 50, period: 'weekly', anchor: 1 })
  })

  it('monthly anchor clamps into 1-31', () => {
    expect(clampAllowance(50, 'monthly', 45)).toEqual({ amount: 50, period: 'monthly', anchor: 31 })
    expect(clampAllowance(50, 'monthly', 0)).toEqual({ amount: 50, period: 'monthly', anchor: 1 })
  })

  it('floors amount and clamps at >= 0', () => {
    expect(clampAllowance(-20, 'weekly', 3)).toEqual({ amount: 0, period: 'weekly', anchor: 3 })
    expect(clampAllowance(19.9, 'monthly', 15)).toEqual({ amount: 19, period: 'monthly', anchor: 15 })
  })

  it('NaN amount drops to 0, NaN anchor drops to 1', () => {
    expect(clampAllowance(NaN, 'weekly', NaN)).toEqual({ amount: 0, period: 'weekly', anchor: 1 })
  })

  it('accepts a fully valid weekly config unchanged', () => {
    expect(clampAllowance(100, 'weekly', 5)).toEqual({ amount: 100, period: 'weekly', anchor: 5 })
  })

  it('accepts a fully valid monthly config unchanged', () => {
    expect(clampAllowance(250, 'monthly', 1)).toEqual({ amount: 250, period: 'monthly', anchor: 1 })
  })
})
