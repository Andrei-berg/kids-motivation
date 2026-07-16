import { describe, it, expect } from 'vitest'

import { rankChildren, type RankEntry } from '@/lib/kid/rating-rank'

function entry(id: string, coinsWeek: number): RankEntry {
  return { id, name: id, coinsWeek }
}

describe('rankChildren', () => {
  it('sorts 3 entries by weekly coins into podium, list empty', () => {
    const { podium, list } = rankChildren([entry('c1', 30), entry('c2', 10), entry('c3', 20)])
    expect(podium.map(e => e.id)).toEqual(['c1', 'c3', 'c2'])
    expect(list).toEqual([])
  })

  it('splits 4 entries into podium of 3 and list of 1', () => {
    const { podium, list } = rankChildren([
      entry('c1', 40), entry('c2', 30), entry('c3', 20), entry('c4', 10),
    ])
    expect(podium).toHaveLength(3)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('c4')
  })

  it('handles a single entry as a solo podium', () => {
    const { podium, list } = rankChildren([entry('c1', 5)])
    expect(podium).toHaveLength(1)
    expect(list).toEqual([])
  })

  it('breaks ties deterministically by childId', () => {
    const { podium } = rankChildren([entry('b', 10), entry('a', 10)])
    expect(podium.map(e => e.id)).toEqual(['a', 'b'])
  })
})
