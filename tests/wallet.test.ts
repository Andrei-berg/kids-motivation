import { describe, it, expect } from 'vitest'

import { sumWeeklyCoins, completionTone, topStreak } from '@/lib/weekly-summary'

describe('sumWeeklyCoins', () => {
  it('sums only positive coins_change entries, ignoring debits', () => {
    expect(
      sumWeeklyCoins([{ coins_change: 100 }, { coins_change: -30 }, { coins_change: 5 }])
    ).toBe(105)
  })

  it('returns 0 for an empty list', () => {
    expect(sumWeeklyCoins([])).toBe(0)
  })
})

describe('completionTone', () => {
  it('returns success at >=80', () => {
    expect(completionTone(82)).toBe('success')
    expect(completionTone(80)).toBe('success')
  })

  it('returns warning at >=50 and <80', () => {
    expect(completionTone(60)).toBe('warning')
    expect(completionTone(50)).toBe('warning')
  })

  it('returns danger below 50', () => {
    expect(completionTone(20)).toBe('danger')
  })
})

describe('topStreak', () => {
  it('returns the highest current_count entry that meets the threshold', () => {
    expect(
      topStreak(
        [
          { name: 'A', current_count: 6 },
          { name: 'B', current_count: 3 },
        ],
        5
      )
    ).toEqual({ name: 'A', days: 6 })
  })

  it('returns null when nobody meets the threshold', () => {
    expect(
      topStreak(
        [
          { name: 'A', current_count: 2 },
          { name: 'B', current_count: 3 },
        ],
        5
      )
    ).toBeNull()
  })
})
