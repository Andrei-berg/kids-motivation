import { describe, it, expect } from 'vitest'
import {
  getLevelFromXP,
  getLevelProgress,
  getWeekRange,
  addDays,
  calculatePercentage,
} from '../utils/helpers'

describe('getLevelFromXP', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(getLevelFromXP(0)).toBe(1)
  })

  it('stays level 1 at 999 XP', () => {
    expect(getLevelFromXP(999)).toBe(1)
  })

  it('reaches level 2 at exactly 1000 XP', () => {
    expect(getLevelFromXP(1000)).toBe(2)
  })

  it('calculates level 3 at 2500 XP', () => {
    expect(getLevelFromXP(2500)).toBe(3)
  })
})

describe('getLevelProgress', () => {
  it('shows 0% progress at the start of level 1', () => {
    const result = getLevelProgress(0)
    expect(result.currentLevel).toBe(1)
    expect(result.progress).toBe(0)
    expect(result.xpNeeded).toBe(1000)
  })

  it('shows 50% progress at 500 XP within a level', () => {
    const result = getLevelProgress(500)
    expect(result.progress).toBe(50)
    expect(result.xpInLevel).toBe(500)
  })

  it('resets progress counter at level boundary', () => {
    const result = getLevelProgress(1000)
    expect(result.currentLevel).toBe(2)
    expect(result.xpInLevel).toBe(0)
    expect(result.progress).toBe(0)
  })
})

describe('getWeekRange', () => {
  it('returns Monday as week start for a Wednesday', () => {
    // 2026-04-01 is a Wednesday
    const { start, end } = getWeekRange('2026-04-01')
    expect(start).toBe('2026-03-30') // Monday
    expect(end).toBe('2026-04-05')   // Sunday
  })

  it('treats Sunday as the end of its week, not start of next', () => {
    // 2026-03-29 is a Sunday
    const { start, end } = getWeekRange('2026-03-29')
    expect(start).toBe('2026-03-23') // Monday
    expect(end).toBe('2026-03-29')   // Same Sunday
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-04-01', 3)).toBe('2026-04-04')
  })

  it('subtracts days with negative input', () => {
    expect(addDays('2026-04-01', -1)).toBe('2026-03-31')
  })

  it('crosses month boundary correctly', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04')
  })
})

describe('calculatePercentage', () => {
  it('returns 0 when target is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0)
  })

  it('caps at 100% when over target', () => {
    expect(calculatePercentage(150, 100)).toBe(100)
  })

  it('calculates correctly at 50%', () => {
    expect(calculatePercentage(50, 100)).toBe(50)
  })
})
