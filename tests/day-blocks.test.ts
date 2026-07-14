import { describe, it, expect } from 'vitest'

import { assembleDayBlocks, resolveBlockPrice, resolveMultiplier } from '@/lib/day-blocks'
import type { DayBlock } from '@/lib/models/day-block.types'

function makeBlock(overrides: Partial<DayBlock> = {}): DayBlock {
  return {
    id: 'block-1',
    family_id: 'fam-1',
    child_id: null,
    legacy_key: null,
    name: 'Test block',
    icon: '⭐',
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

describe('assembleDayBlocks', () => {
  it('hides a school-only block (day_types=["school"]) on a vacation day and shows it on a school day', () => {
    const grade = makeBlock({ id: 'grade', legacy_key: 'grade', day_types: ['school'] })
    expect(assembleDayBlocks([grade], 'vacation', '2026-04-07')).toHaveLength(0)
    expect(assembleDayBlocks([grade], 'school', '2026-04-07').map(b => b.id)).toEqual(['grade'])
  })

  it('shows a block with empty day_types on every day type (room block always-visible convention)', () => {
    const room = makeBlock({ id: 'room', legacy_key: 'room', day_types: [] })
    for (const dayType of ['school', 'weekend', 'vacation', 'sick']) {
      expect(assembleDayBlocks([room], dayType, '2026-04-07').map(b => b.id)).toEqual(['room'])
    }
  })

  it('shows a block whose day_types includes "always" on every day type', () => {
    const block = makeBlock({ id: 'always-block', day_types: ['always'] })
    expect(assembleDayBlocks([block], 'vacation', '2026-04-07').map(b => b.id)).toEqual(['always-block'])
    expect(assembleDayBlocks([block], 'school', '2026-04-08').map(b => b.id)).toEqual(['always-block'])
  })

  it('respects days_of_week: a block with [1,3] (Tue/Thu) shows only on those weekdays', () => {
    // 2026-04-07 is a Tuesday, 2026-04-09 is a Thursday, 2026-04-08 is a Wednesday.
    const block = makeBlock({ id: 'tue-thu', days_of_week: [1, 3] })
    expect(assembleDayBlocks([block], 'school', '2026-04-07').map(b => b.id)).toEqual(['tue-thu']) // Tue
    expect(assembleDayBlocks([block], 'school', '2026-04-09').map(b => b.id)).toEqual(['tue-thu']) // Thu
    expect(assembleDayBlocks([block], 'school', '2026-04-08')).toHaveLength(0) // Wed
  })

  it('an empty days_of_week array shows the block on every weekday', () => {
    const block = makeBlock({ id: 'every-day', days_of_week: [] })
    expect(assembleDayBlocks([block], 'school', '2026-04-07').map(b => b.id)).toEqual(['every-day']) // Tue
    expect(assembleDayBlocks([block], 'school', '2026-04-08').map(b => b.id)).toEqual(['every-day']) // Wed
  })

  it('drops inactive blocks regardless of day_types/days_of_week', () => {
    const block = makeBlock({ id: 'inactive', is_active: false })
    expect(assembleDayBlocks([block], 'school', '2026-04-07')).toHaveLength(0)
  })

  it('preserves ascending sort_order in the output', () => {
    const b3 = makeBlock({ id: 'c', sort_order: 3 })
    const b1 = makeBlock({ id: 'a', sort_order: 1 })
    const b2 = makeBlock({ id: 'b', sort_order: 2 })
    const result = assembleDayBlocks([b3, b1, b2], 'school', '2026-04-07')
    expect(result.map(b => b.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('resolveBlockPrice', () => {
  const settings = {
    coins_per_room_task: 3,
    coins_per_good_behavior: 5,
    coins_per_book: 20,
    coins_per_exercise: 5,
  }

  it('returns the wallet_settings fallback when price is NULL and legacy_key is "room"', () => {
    const block = makeBlock({ legacy_key: 'room', price: null })
    expect(resolveBlockPrice(block, settings)).toBe(3)
  })

  it('returns the explicit block price when non-null, overriding the settings fallback', () => {
    const block = makeBlock({ legacy_key: 'room', price: 7 })
    expect(resolveBlockPrice(block, settings)).toBe(7)
  })

  it('returns null for legacy_key "grade" (per-value pricing signals "use existing per-row computation")', () => {
    const block = makeBlock({ legacy_key: 'grade', price: null })
    expect(resolveBlockPrice(block, settings)).toBeNull()
  })

  it('returns null for legacy_key "sport" and "activity" (per-value pricing)', () => {
    expect(resolveBlockPrice(makeBlock({ legacy_key: 'sport', price: null }), settings)).toBeNull()
    expect(resolveBlockPrice(makeBlock({ legacy_key: 'activity', price: null }), settings)).toBeNull()
  })

  it('returns null for a custom block (legacy_key null) with no explicit price', () => {
    const block = makeBlock({ legacy_key: null, price: null })
    expect(resolveBlockPrice(block, settings)).toBeNull()
  })
})

describe('resolveMultiplier', () => {
  it('returns the matching multiplier when present and > 0', () => {
    const block = makeBlock({ multipliers: { vacation: 2 } })
    expect(resolveMultiplier(block, 'vacation')).toBe(2)
  })

  it('returns 1 when the dayType key is missing from multipliers', () => {
    const block = makeBlock({ multipliers: { vacation: 2 } })
    expect(resolveMultiplier(block, 'school')).toBe(1)
  })

  it('returns 1 when multipliers is empty', () => {
    const block = makeBlock({ multipliers: {} })
    expect(resolveMultiplier(block, 'vacation')).toBe(1)
  })
})
