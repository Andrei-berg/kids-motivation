import { describe, it, expect } from 'vitest'

import { computeFillProgress, diffSectionCoins } from '@/lib/kid/day-fill-progress'

describe('computeFillProgress', () => {
  it('Test 1: empty applicable map returns zeroed progress with no divide-by-zero', () => {
    expect(computeFillProgress({}, {})).toEqual({ doneCount: 0, total: 0, pct: 0 })
  })

  it('Test 2: all-applicable-and-all-done returns pct 100', () => {
    const applicable = { mood: true, room: true }
    const done = { mood: true, room: true }
    expect(computeFillProgress(applicable, done)).toEqual({ doneCount: 2, total: 2, pct: 100 })
  })

  it('Test 3 (D-09): a category with applicable=false is excluded from both numerator and denominator, not counted as incomplete', () => {
    const applicable = { mood: true, room: true, sport: false }
    const done = { mood: true }
    expect(computeFillProgress(applicable, done)).toEqual({ doneCount: 1, total: 2, pct: 50 })
  })

  it('Test 4: a done key that is not applicable does not raise doneCount or total', () => {
    const applicable = { mood: true, sport: false }
    const done = { mood: true, sport: true }
    expect(computeFillProgress(applicable, done)).toEqual({ doneCount: 1, total: 1, pct: 100 })
  })

  it('Test 5: 1 of 3 applicable done rounds to pct 33', () => {
    const applicable = { mood: true, room: true, grade: true }
    const done = { mood: true }
    expect(computeFillProgress(applicable, done)).toEqual({ doneCount: 1, total: 3, pct: 33 })
  })

  it('Test 6: a done key missing entirely from the done map counts as not done', () => {
    const applicable = { mood: true, room: true }
    const done = { mood: true }
    expect(computeFillProgress(applicable, done)).toEqual({ doneCount: 1, total: 2, pct: 50 })
  })
})

describe('diffSectionCoins', () => {
  it('Test 7: key added returns a single positive delta entry', () => {
    expect(diffSectionCoins({}, { room: 3 })).toEqual([{ key: 'room', delta: 3 }])
  })

  it('Test 8 (D-10 untoggle): key removed returns the exact negative inverse', () => {
    expect(diffSectionCoins({ room: 3 }, {})).toEqual([{ key: 'room', delta: -3 }])
  })

  it('Test 9: value increased returns the positive difference', () => {
    expect(diffSectionCoins({ grade: 5 }, { grade: 12 })).toEqual([{ key: 'grade', delta: 7 }])
  })

  it('Test 10 (D-11 loss): a negative value appearing returns that negative delta', () => {
    expect(diffSectionCoins({}, { sport: -10 })).toEqual([{ key: 'sport', delta: -10 }])
  })

  it('Test 11: identical maps return no deltas (no flyup on a no-op re-render)', () => {
    expect(diffSectionCoins({ room: 3, grade: 5 }, { room: 3, grade: 5 })).toEqual([])
  })

  it('Test 12: two keys changing at once returns both entries, next-keys first then next-absent prev keys', () => {
    const prev = { room: 3, grade: 5 }
    const next = { grade: 12, activity: 4 }
    expect(diffSectionCoins(prev, next)).toEqual([
      { key: 'grade', delta: 7 },
      { key: 'activity', delta: 4 },
      { key: 'room', delta: -3 },
    ])
  })
})
