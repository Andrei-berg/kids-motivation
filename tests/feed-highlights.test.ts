import { describe, it, expect } from 'vitest'

import { RANK_ORDER, pickHighlight, RAIL_COLOR_MAP } from '@/lib/kid/feed-highlights'
import type { FeedEvent, FeedEventKind } from '@/lib/models/feed.types'

function event(overrides: Partial<FeedEvent>): FeedEvent {
  return {
    id: 'evt-1',
    family_id: 'fam-1',
    child_id: 'child-1',
    actor_member_id: null,
    kind: 'day_filled',
    title: 'Test event',
    body: null,
    amount: null,
    icon: null,
    ref_type: 'day',
    ref_id: null,
    metadata: {},
    created_at: '2026-09-17T10:00:00.000Z',
    ...overrides,
  }
}

describe('RANK_ORDER', () => {
  it('is exactly the locked 8-kind order', () => {
    expect(RANK_ORDER).toEqual([
      'badge', 'medal', 'boost', 'streak',
      'reading_approved', 'reward_approved', 'purchase', 'day_filled',
    ])
  })
})

describe('pickHighlight', () => {
  it('returns null for an empty array', () => {
    expect(pickHighlight([])).toBeNull()
  })

  it('returns the higher-ranked event when comparing day_filled vs badge', () => {
    const dayFilled = event({ id: 'e1', kind: 'day_filled' })
    const badge = event({ id: 'e2', kind: 'badge' })
    const result = pickHighlight([dayFilled, badge])
    expect(result?.id).toBe('e2')
  })

  it('tiebreaks same-rank events on newest created_at', () => {
    const early = event({ id: 'e1', kind: 'medal', created_at: '2026-09-17T09:00:00.000Z' })
    const late = event({ id: 'e2', kind: 'medal', created_at: '2026-09-17T11:00:00.000Z' })
    const result = pickHighlight([early, late])
    expect(result?.id).toBe('e2')
  })

  it('sorts an unranked kind LAST, not first (guards the indexOf -1 trap)', () => {
    const note = event({ id: 'e1', kind: 'note' })
    const dayFilled = event({ id: 'e2', kind: 'day_filled' })
    const result = pickHighlight([note, dayFilled])
    expect(result?.id).toBe('e2')
  })

  it('returns a single unranked event as the highlight when it is the only event', () => {
    const note = event({ id: 'e1', kind: 'note' })
    const result = pickHighlight([note])
    expect(result?.id).toBe('e1')
  })

  it('does not mutate the caller-supplied array', () => {
    const events = [event({ id: 'e1', kind: 'day_filled' }), event({ id: 'e2', kind: 'badge' })]
    const copy = [...events]
    pickHighlight(events)
    expect(events).toEqual(copy)
  })
})

describe('RAIL_COLOR_MAP', () => {
  it('resolves every kind in RANK_ORDER to a truthy hex', () => {
    for (const kind of RANK_ORDER) {
      expect(RAIL_COLOR_MAP[kind]).toBeTruthy()
    }
  })

  it('has exactly the 10 locked keys, no coins_earned/coins_spent, no invented kind', () => {
    const expectedKeys: FeedEventKind[] = [
      'boost', 'streak', 'medal', 'badge', 'day_filled',
      'reading_approved', 'level_up', 'purchase', 'reward_approved', 'note',
    ]
    expect(Object.keys(RAIL_COLOR_MAP).sort()).toEqual([...expectedKeys].sort())
  })

  it('maps each kind to the exact locked hex value (D-08)', () => {
    expect(RAIL_COLOR_MAP.boost).toBe('#FF9F2E')
    expect(RAIL_COLOR_MAP.streak).toBe('#FF9F2E')
    expect(RAIL_COLOR_MAP.medal).toBe('#FF6B8A')
    expect(RAIL_COLOR_MAP.badge).toBe('#FF6B8A')
    expect(RAIL_COLOR_MAP.day_filled).toBe('#12B886')
    expect(RAIL_COLOR_MAP.reading_approved).toBe('#7A5AF0')
    expect(RAIL_COLOR_MAP.level_up).toBe('#7A5AF0')
    expect(RAIL_COLOR_MAP.purchase).toBe('#2F7FE4')
    expect(RAIL_COLOR_MAP.reward_approved).toBe('#2F7FE4')
    expect(RAIL_COLOR_MAP.note).toBe('#E9ECF3')
  })
})

describe('FEED-04 content rule', () => {
  // Regression guard: the key set below is the exact, exhaustive set of
  // non-punitive kinds allowed a rail color. If a future change adds a
  // 'penalty'/'correction'/negative-behavior-tag key to RAIL_COLOR_MAP, this
  // assertion fails the suite instead of silently shipping a punitive card
  // to a kid (FEED-04 / D-03 — see the header comment in FamilyFeed.tsx and
  // the family_events.kind CHECK constraint, the real enforcement point).
  it('RAIL_COLOR_MAP key set is exactly the 10 locked non-punitive kinds', () => {
    const expectedKeys: FeedEventKind[] = [
      'badge', 'boost', 'day_filled', 'level_up', 'medal',
      'note', 'purchase', 'reading_approved', 'reward_approved', 'streak',
    ]
    expect(Object.keys(RAIL_COLOR_MAP).sort()).toEqual([...expectedKeys].sort())
  })

  it('RANK_ORDER has exactly 8 entries, all present in RAIL_COLOR_MAP', () => {
    expect(RANK_ORDER.length).toBe(8)
    for (const kind of RANK_ORDER) {
      expect(RAIL_COLOR_MAP[kind]).toBeTruthy()
    }
  })
})
