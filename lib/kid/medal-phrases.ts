// lib/kid/medal-phrases.ts
// D-11 locked 8-phrase set for the kid-initiated medal send
// (.planning/phases/09.2-feed-social/09.2-CONTEXT.md). Pure module — no
// React, no Supabase — importable from a 'use server' file.
//
// This is the allow-list the SERVER validates against (not just the picker
// UI, which lands in plan 09.2-06), so a crafted client call cannot turn the
// kid medal into a freeform text channel. The parent's existing 200-char
// freeform message in `sendMedal` is a separate, unchanged path.

export const MEDAL_PHRASES = [
  'Ты сегодня молодец 🏅',
  'Горжусь тобой! 🌟',
  'Красавчик, так держать! 💪',
  'Ты крут, признаю 🔥',
  'Заслуженно! 🏆',
  'Ты меня вдохновляешь сегодня ✨',
  'Респект! 🙌',
  'Лучший день, продолжай в том же духе 🚀',
] as const

const MEDAL_PHRASE_SET: ReadonlySet<string> = new Set(MEDAL_PHRASES)

/** Exact membership check — no trimming, no case folding. */
export function isKnownMedalPhrase(text: string): boolean {
  return MEDAL_PHRASE_SET.has(text)
}
