import { describe, it, expect } from 'vitest'

import { levelForXp, computeLevelUp } from '@/lib/kid/level'

describe('levelForXp', () => {
  it('mirrors Math.floor(xp/1000)+1', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(999)).toBe(1)
    expect(levelForXp(1000)).toBe(2)
    expect(levelForXp(1500)).toBe(2)
  })
})

describe('computeLevelUp', () => {
  it('returns true only when the integer level crossed upward', () => {
    expect(computeLevelUp(900, 1100)).toBe(true) // crossed 1 -> 2
    expect(computeLevelUp(1100, 1500)).toBe(false) // still level 2
    expect(computeLevelUp(1500, 1000)).toBe(false) // no downward level-up
  })
})
