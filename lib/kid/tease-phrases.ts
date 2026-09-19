// lib/kid/tease-phrases.ts
// FEED-06 "Подколоть" (tease) locked phrase groups + kind→group resolver
// (D-04 in .planning/phases/09.2-feed-social/09.2-CONTEXT.md). Pure lookup
// module — no React, no Supabase, no I/O. This is the single source of the
// tease copy: it is imported by both `lib/repositories/feed.repo.ts` (for
// write-time validation and read-time tagging) and `components/feed/
// FamilyFeed.tsx` (for rendering the tease tray, plan 09.2-04). If a phrase
// is ever removed from a group, it must be moved into a `LEGACY_TEASE_PHRASES`
// array that `ALL_TEASE_PHRASES` still includes — otherwise already-stored
// teases would stop being recognized as teases (isKnownTeasePhrase would
// start returning false for a row that was validly written in the past).

import type { FeedEventKind } from '@/lib/models/feed.types'

// Achievement group — badge, medal, streak, boost, level_up cards.
export const TEASE_ACHIEVEMENT = [
  'Красавчик 🔥',
  'Погнали на рекорд!',
  'Ну ты и мастер! 😎',
  'Вот это да, снимаю шляпу 🎩',
  'Теперь моя очередь удивлять 😏',
  'Держись, я догоняю! 💪',
] as const

// Routine group — day_filled, reading_approved cards. Also the locked
// fallback group (Claude's Discretion, CONTEXT.md) for any kind not
// explicitly assigned below: coins_earned, coins_spent, note.
export const TEASE_ROUTINE = [
  'Ну погоди 😤',
  'Не забудь про уроки 😤',
  'Я быстрее наберу 😏',
  'Ты так не сможешь завтра 😏',
  'Завтра я тебя обгоню 🏃',
  'Скромно, но пойдёт 😏',
] as const

// Purchase/reward group — purchase, reward_approved cards.
export const TEASE_PURCHASE = [
  'Всё промотал? 😂',
  'Приятной покупки, транжира 💸',
  'А мне не завидно… ну ладно, немного 😏',
  'Копи-копи, а потом раз — и нету 😂',
  'Богач нашёлся 👑',
] as const

// No phrases have ever been retired from a group. Kept as an empty array so
// the "move removed phrases here" convention documented above has a concrete
// landing spot the moment it's ever needed.
export const LEGACY_TEASE_PHRASES: readonly string[] = []

// D-04 kind→group map — same `Partial<Record<FeedEventKind, X>>` shape as
// `RAIL_COLOR_MAP` in `lib/kid/feed-highlights.ts`. `coins_earned`,
// `coins_spent`, and `note` are deliberately left out of the map; they are
// covered by the fallback in `teasePhrasesFor` below, matching how
// `rankIndex` handles unranked kinds instead of enumerating them.
export const TEASE_PHRASES_BY_KIND: Partial<Record<FeedEventKind, readonly string[]>> = {
  badge: TEASE_ACHIEVEMENT,
  medal: TEASE_ACHIEVEMENT,
  streak: TEASE_ACHIEVEMENT,
  boost: TEASE_ACHIEVEMENT,
  level_up: TEASE_ACHIEVEMENT,
  day_filled: TEASE_ROUTINE,
  reading_approved: TEASE_ROUTINE,
  purchase: TEASE_PURCHASE,
  reward_approved: TEASE_PURCHASE,
}

/**
 * Returns the locked phrase tray for a feed event kind. Never returns an
 * empty array — a kind absent from `TEASE_PHRASES_BY_KIND` falls back to the
 * Routine group (the locked fallback, per CONTEXT.md Claude's Discretion).
 */
export function teasePhrasesFor(kind: FeedEventKind): readonly string[] {
  return TEASE_PHRASES_BY_KIND[kind] ?? TEASE_ROUTINE
}

// Flattened union of the three groups — 17 entries, no duplicates across
// groups. `LEGACY_TEASE_PHRASES` is included (currently empty) so a phrase
// retired from an active group in the future still validates as "known".
export const ALL_TEASE_PHRASES: readonly string[] = [
  ...TEASE_ACHIEVEMENT,
  ...TEASE_ROUTINE,
  ...TEASE_PURCHASE,
  ...LEGACY_TEASE_PHRASES,
]

const KNOWN_TEASE_PHRASE_SET = new Set(ALL_TEASE_PHRASES)

/**
 * Exact membership test against the locked phrase set. No trimming, no case
 * folding — this is the anti-forgery hook that stops a hand-typed
 * `[[tease]] anything` from being treated as a tease (see
 * `lib/repositories/feed.repo.ts` `isTeaseComment`).
 */
export function isKnownTeasePhrase(text: string): boolean {
  return KNOWN_TEASE_PHRASE_SET.has(text)
}
