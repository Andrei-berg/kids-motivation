// WR-05 fix: regression coverage for the phase's own highest-risk new
// logic (per Plan 08's threat model T-058-19) — the legacy_key-matched
// dedup in getDayBlocks is *the* mechanism preventing a per-child override
// from being double-listed (settings screen AND the live kid day-fill form
// both read getDayBlocks) alongside its family default. Follows the
// vi.mock('@/lib/supabase')-backed pattern already established this phase
// in tests/calendar-range.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

import { supabase } from '@/lib/supabase'
import { addDayBlock, getDayBlocks } from '@/lib/repositories/day-blocks.repo'
import type { DayBlock } from '@/lib/models/day-block.types'

beforeEach(() => {
  vi.clearAllMocks()
})

function makeRow(overrides: Partial<DayBlock> = {}): DayBlock {
  return {
    id: 'row',
    family_id: 'fam-1',
    child_id: null,
    legacy_key: null,
    name: 'Room',
    icon: '🧹',
    price: null,
    day_types: [],
    days_of_week: [],
    schedule_link: null,
    who_fills: 'kid',
    multipliers: {},
    sort_order: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('addDayBlock — legacyKey passthrough', () => {
  it('inserts legacy_key: legacyKey when provided (per-child override copy-on-write)', async () => {
    let insertedPayload: any = null
    const chain: any = {
      insert: vi.fn((payload: any) => { insertedPayload = payload; return chain }),
      select: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: makeRow({ legacy_key: 'room' }), error: null })),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as any)

    await addDayBlock({
      familyId: 'fam-1',
      childId: 'child-1',
      legacyKey: 'room',
      name: 'Room',
    })

    expect(insertedPayload.legacy_key).toBe('room')
    expect(insertedPayload.child_id).toBe('child-1')
  })

  it('inserts legacy_key: null when omitted (ordinary custom block)', async () => {
    let insertedPayload: any = null
    const chain: any = {
      insert: vi.fn((payload: any) => { insertedPayload = payload; return chain }),
      select: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: makeRow(), error: null })),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as any)

    await addDayBlock({ familyId: 'fam-1', name: 'Custom chore' })

    expect(insertedPayload.legacy_key).toBeNull()
  })
})

describe('getDayBlocks — legacy_key dedup merge', () => {
  // Shared fixture: one family-default "room" block and this child's active
  // override of it (same legacy_key, different id/price), plus one custom
  // family block (legacy_key null, always kept).
  const familyDefault = makeRow({ id: 'default-room', legacy_key: 'room', child_id: null, price: 3, sort_order: 0 })
  const childOverride = makeRow({ id: 'override-room', legacy_key: 'room', child_id: 'child-1', price: 7, sort_order: 0 })
  const customBlock = makeRow({ id: 'custom-1', legacy_key: null, child_id: null, price: 5, sort_order: 1 })

  function mockRowsReturnedAs(rows: DayBlock[]) {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      is: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as any)
    return chain
  }

  it('returns exactly one row per shared legacy_key (the child-specific one wins), default-then-override order', async () => {
    mockRowsReturnedAs([familyDefault, childOverride, customBlock])
    const result = await getDayBlocks('fam-1', { childId: 'child-1' })

    const roomRows = result.filter(r => r.legacy_key === 'room')
    expect(roomRows).toHaveLength(1)
    expect(roomRows[0].id).toBe('override-room')
    expect(roomRows[0].child_id).toBe('child-1')
    // Custom (legacy_key null) blocks are always kept, in addition to the deduped one.
    expect(result.some(r => r.id === 'custom-1')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('returns exactly one row per shared legacy_key regardless of row order (override-then-default)', async () => {
    mockRowsReturnedAs([childOverride, familyDefault, customBlock])
    const result = await getDayBlocks('fam-1', { childId: 'child-1' })

    const roomRows = result.filter(r => r.legacy_key === 'room')
    expect(roomRows).toHaveLength(1)
    expect(roomRows[0].id).toBe('override-room')
    expect(result).toHaveLength(2)
  })

  it('without a childId, never dedupes — returns family-default rows as-is', async () => {
    mockRowsReturnedAs([familyDefault, customBlock])
    const result = await getDayBlocks('fam-1')

    expect(result).toHaveLength(2)
    expect(result.map(r => r.id).sort()).toEqual(['custom-1', 'default-room'])
  })
})
