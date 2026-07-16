import { describe, it, expect } from 'vitest'

import { detectAward } from '@/lib/kid/awardResult'

describe('detectAward', () => {
  it('parses creditedCoins and hasStreak from an award response with sources', () => {
    expect(detectAward({ ok: true, creditedCoins: 12, appliedSources: ['room', 'grade'] })).toEqual({
      creditedCoins: 12,
      hasStreak: false,
    })
  })

  it('detects a streak source among appliedSources', () => {
    expect(detectAward({ ok: true, creditedCoins: 20, appliedSources: ['room', 'streak'] }).hasStreak).toBe(true)
  })

  it('defaults defensively and never throws on a missing/malformed response', () => {
    expect(detectAward({})).toEqual({ creditedCoins: 0, hasStreak: false })
    expect(detectAward(undefined)).toEqual({ creditedCoins: 0, hasStreak: false })
    expect(detectAward(null)).toEqual({ creditedCoins: 0, hasStreak: false })
  })
})
