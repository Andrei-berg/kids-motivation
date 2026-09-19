import { describe, it, expect } from 'vitest'

import {
  TEASE_ACHIEVEMENT,
  TEASE_ROUTINE,
  TEASE_PURCHASE,
  ALL_TEASE_PHRASES,
  teasePhrasesFor,
  isKnownTeasePhrase,
} from '@/lib/kid/tease-phrases'
import type { FeedEventKind } from '@/lib/models/feed.types'

const ALL_KINDS: FeedEventKind[] = [
  'coins_earned', 'coins_spent', 'day_filled', 'badge', 'streak', 'purchase',
  'reward_approved', 'medal', 'reading_approved', 'level_up', 'boost', 'note',
]

describe('FEED-06 tease phrases', () => {
  it('each group has the exact locked length', () => {
    expect(TEASE_ACHIEVEMENT.length).toBe(6)
    expect(TEASE_ROUTINE.length).toBe(6)
    expect(TEASE_PURCHASE.length).toBe(5)
  })

  it('ALL_TEASE_PHRASES has exactly 17 unique entries', () => {
    expect(ALL_TEASE_PHRASES.length).toBe(17)
    expect(new Set(ALL_TEASE_PHRASES).size).toBe(17)
  })

  it('every FeedEventKind resolves to a non-empty tease phrase tray', () => {
    for (const kind of ALL_KINDS) {
      const tray = teasePhrasesFor(kind)
      expect(tray.length).toBeGreaterThan(0)
    }
  })

  it('uncategorized kinds fall back to TEASE_ROUTINE by identity', () => {
    expect(teasePhrasesFor('note')).toBe(TEASE_ROUTINE)
    expect(teasePhrasesFor('coins_earned')).toBe(TEASE_ROUTINE)
    expect(teasePhrasesFor('coins_spent')).toBe(TEASE_ROUTINE)
  })

  it('badge resolves to TEASE_ACHIEVEMENT', () => {
    expect(teasePhrasesFor('badge')).toBe(TEASE_ACHIEVEMENT)
  })

  it('isKnownTeasePhrase does exact membership matching', () => {
    expect(isKnownTeasePhrase('Ну погоди 😤')).toBe(true)
    expect(isKnownTeasePhrase('Ну погоди')).toBe(false)
  })
})
