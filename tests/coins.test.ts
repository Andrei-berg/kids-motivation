import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the service
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

import { supabase } from '../lib/supabase'
import { getWeekScore } from '../lib/services/coins.service'

function makeChain(data: any) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({ data }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getWeekScore — coin calculations', () => {
  it('sums grade coins correctly: 5→+5, 4→+3, 3→-3', async () => {
    const mockFrom = vi.mocked(supabase.from)
    mockFrom
      .mockReturnValueOnce(makeChain([]) as any)          // days table
      .mockReturnValueOnce(makeChain([              // subject_grades
        { grade: 5, date: '2026-03-30' },
        { grade: 4, date: '2026-03-31' },
        { grade: 3, date: '2026-04-01' },
      ]) as any)

    const result = await getWeekScore('adam', '2026-03-30')
    // 5 + 3 + (-3) = 5
    expect(result.coinsFromGrades).toBe(5)
  })

  it('gives +3 coins per room_ok day', async () => {
    const mockFrom = vi.mocked(supabase.from)
    mockFrom
      .mockReturnValueOnce(makeChain([
        { date: '2026-03-30', room_ok: true, good_behavior: false },
        { date: '2026-03-31', room_ok: true, good_behavior: false },
        { date: '2026-04-01', room_ok: false, good_behavior: false },
      ]) as any)
      .mockReturnValueOnce(makeChain([]) as any)

    const result = await getWeekScore('adam', '2026-03-30')
    expect(result.coinsFromRoom).toBe(6) // 2 days × 3
    expect(result.roomOkDays).toBe(2)
  })

  it('gives +5 coins per good_behavior day', async () => {
    const mockFrom = vi.mocked(supabase.from)
    mockFrom
      .mockReturnValueOnce(makeChain([
        { date: '2026-03-30', room_ok: false, good_behavior: true },
        { date: '2026-03-31', room_ok: false, good_behavior: true },
      ]) as any)
      .mockReturnValueOnce(makeChain([]) as any)

    const result = await getWeekScore('adam', '2026-03-30')
    expect(result.coinsFromBehavior).toBe(10) // 2 days × 5
  })

  it('totals all coin sources', async () => {
    const mockFrom = vi.mocked(supabase.from)
    mockFrom
      .mockReturnValueOnce(makeChain([
        { date: '2026-03-30', room_ok: true, good_behavior: true },
      ]) as any)
      .mockReturnValueOnce(makeChain([
        { grade: 5, date: '2026-03-30' },
      ]) as any)

    const result = await getWeekScore('adam', '2026-03-30')
    // 5 (grade) + 3 (room) + 5 (behavior) = 13
    expect(result.total).toBe(13)
  })

  it('applies penalty for grade 2 (−5 coins)', async () => {
    const mockFrom = vi.mocked(supabase.from)
    mockFrom
      .mockReturnValueOnce(makeChain([]) as any)
      .mockReturnValueOnce(makeChain([
        { grade: 2, date: '2026-03-30' },
      ]) as any)

    const result = await getWeekScore('adam', '2026-03-30')
    expect(result.coinsFromGrades).toBe(-5)
    expect(result.total).toBe(-5)
  })
})
