import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the repo under test
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

import { supabase } from '@/lib/supabase'
import { getDaysInRange } from '@/lib/repositories/calendar.repo'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getDaysInRange', () => {
  it('mirrors getWeekData\'s query shape: eq(child_id) + gte(date) + lte(date) + order(date)', async () => {
    const calls: Record<string, any[]> = {}
    const chain: any = {
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockImplementation((...args: any[]) => {
      calls.eq = args
      return chain
    })
    chain.gte.mockImplementation((...args: any[]) => {
      calls.gte = args
      return chain
    })
    chain.lte.mockImplementation((...args: any[]) => {
      calls.lte = args
      return chain
    })
    chain.order.mockImplementation((...args: any[]) => {
      calls.order = args
      return Promise.resolve({ data: [{ date: '2026-09-05' }], error: null })
    })

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue(chain as any)

    const result = await getDaysInRange('c1', '2026-09-01', '2026-09-30')

    expect(mockFrom).toHaveBeenCalledWith('days')
    expect(calls.eq).toEqual(['child_id', 'c1'])
    expect(calls.gte).toEqual(['date', '2026-09-01'])
    expect(calls.lte).toEqual(['date', '2026-09-30'])
    expect(calls.order).toEqual(['date'])
    expect(result).toEqual([{ date: '2026-09-05' }])
  })

  it('returns [] when the resolved data is null/empty', async () => {
    const chain: any = {
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.gte.mockReturnValue(chain)
    chain.lte.mockReturnValue(chain)
    chain.order.mockResolvedValue({ data: null, error: null })

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue(chain as any)

    const result = await getDaysInRange('c1', '2026-09-01', '2026-09-30')
    expect(result).toEqual([])
  })
})
