import { describe, it, expect } from 'vitest'

import { scheduleDowToBlockDow } from '@/lib/day-blocks'

describe('scheduleDowToBlockDow', () => {
  it('converts Mon(1) and Sun(7) to 0 and 6 with no off-by-one', () => {
    expect(scheduleDowToBlockDow([1, 7])).toEqual([0, 6])
  })

  it('converts a mid-week day (Thu=4) to 3', () => {
    expect(scheduleDowToBlockDow([4])).toEqual([3])
  })

  it('returns an empty array for an empty input', () => {
    expect(scheduleDowToBlockDow([])).toEqual([])
  })
})
