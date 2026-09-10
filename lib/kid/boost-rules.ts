// Single source of truth for the weekly boost + one-time milestone tiers.
// Both the authoritative award route (app/api/wallet/award/route.ts, block 7)
// and the display helper (lib/kid/boost.ts) call these pure functions so the
// "до буста" copy a kid sees can never disagree with what actually credits.
//
// Amounts come from wallet_settings (per-family, parent-tunable). Defaults here
// mirror SETTINGS_DEFAULTS in app/api/wallet/_lib.ts and the getWalletSettings
// fallback in lib/repositories/wallet.repo.ts — keep all three in sync.

export interface BoostSettings {
  // Grades component — "вся неделя пятёрки → до +t3"
  boost_grades_t1: number
  boost_grades_t2: number
  boost_grades_t3: number
  boost_grades_t1_count: number
  boost_grades_t2_count: number
  boost_grades_perfect_days: number
  // Consistency component (Adam's streaks / days-in-a-row idea)
  boost_full_week: number
  boost_streaks_2: number
  boost_streaks_3: number
  // One-time milestone tiers
  boost_milestone_7d: number
  boost_milestone_30d: number
  boost_milestone_100d: number
  boost_milestone_streak30: number
}

export const DEFAULT_BOOST_SETTINGS: BoostSettings = {
  boost_grades_t1: 150,
  boost_grades_t2: 300,
  boost_grades_t3: 500,
  boost_grades_t1_count: 5,
  boost_grades_t2_count: 10,
  boost_grades_perfect_days: 4,
  boost_full_week: 50,
  boost_streaks_2: 50,
  boost_streaks_3: 100,
  boost_milestone_7d: 70,
  boost_milestone_30d: 150,
  boost_milestone_100d: 500,
  boost_milestone_streak30: 300,
}

/** Reads a full/partial settings row and fills any gap from the defaults. */
export function boostSettings(row: Partial<Record<string, unknown>> | null | undefined): BoostSettings {
  const out = { ...DEFAULT_BOOST_SETTINGS }
  if (row) {
    for (const k of Object.keys(DEFAULT_BOOST_SETTINGS) as (keyof BoostSettings)[]) {
      const v = row[k]
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    }
  }
  return out
}

export interface WeeklyGradeStats {
  /** grades whose coin value is > 0 (scale-agnostic "good grade") */
  goodGradeCount: number
  /** grades equal to the scale's top value ('5' / '12' / 'A') */
  topGradeCount: number
  /** any grade with a negative coin value this week */
  hasPenaltyGrade: boolean
  /** distinct dates with at least one grade */
  gradedDays: number
}

export interface WeeklyConsistencyStats {
  /** distinct dates in the current week that have a saved `days` row (0..7) */
  filledDays: number
  /** count of streaks currently at/above their configured threshold (0..3) */
  streaksAtThreshold: number
}

export interface WeeklyBoostResult {
  grades: number
  consistency: number
  total: number
  max: number
  /** kid-voice "what unlocks the next chunk" line */
  nextLabel: string
}

/**
 * Grades component: take the single best tier reached (max, not sum). A single
 * penalty grade anywhere in the week disqualifies the whole grades bonus — the
 * boost rewards a genuinely clean week.
 */
function gradesBoost(s: BoostSettings, g: WeeklyGradeStats): { coins: number; next: string | null } {
  if (g.hasPenaltyGrade || g.topGradeCount === 0) {
    return { coins: 0, next: `${s.boost_grades_t1_count} пятёрок за неделю → +${s.boost_grades_t1} 🪙` }
  }
  const perfect =
    g.goodGradeCount === g.topGradeCount && g.gradedDays >= s.boost_grades_perfect_days
  if (perfect) return { coins: s.boost_grades_t3, next: null }
  if (g.topGradeCount >= s.boost_grades_t2_count) {
    return { coins: s.boost_grades_t2, next: `вся неделя на отлично → +${s.boost_grades_t3} 🪙` }
  }
  if (g.topGradeCount >= s.boost_grades_t1_count) {
    const left = s.boost_grades_t2_count - g.topGradeCount
    return { coins: s.boost_grades_t1, next: `ещё ${left} пятёрок → +${s.boost_grades_t2} 🪙` }
  }
  const left = s.boost_grades_t1_count - g.topGradeCount
  return { coins: 0, next: `ещё ${left} ${plural(left, 'пятёрка', 'пятёрки', 'пятёрок')} → +${s.boost_grades_t1} 🪙` }
}

function consistencyBoost(s: BoostSettings, c: WeeklyConsistencyStats): number {
  let coins = 0
  if (c.filledDays >= 7) coins += s.boost_full_week
  if (c.streaksAtThreshold >= 3) coins += s.boost_streaks_3
  else if (c.streaksAtThreshold >= 2) coins += s.boost_streaks_2
  return coins
}

export function computeWeeklyBoost(
  s: BoostSettings,
  g: WeeklyGradeStats,
  c: WeeklyConsistencyStats,
): WeeklyBoostResult {
  const gr = gradesBoost(s, g)
  const consistency = consistencyBoost(s, c)
  const total = gr.coins + consistency
  const max = s.boost_grades_t3 + s.boost_full_week + s.boost_streaks_3

  let nextLabel: string
  if (gr.next) nextLabel = `До буста: ${gr.next}`
  else if (c.filledDays < 7) nextLabel = 'Заполни все 7 дней недели — добавит ещё монет'
  else nextLabel = 'Буст недели на максимуме — так держать!'

  return { grades: gr.coins, consistency, total, max, nextLabel }
}

// ── One-time milestone tiers ───────────────────────────────────────────────

export interface MilestoneStats {
  daysFilledTotal: number
  daysFilledStreak: number  // current consecutive run ending today/yesterday
  bestAnyStreak: number     // max streaks.best_count across categories
}

export interface MilestoneTier {
  key: string
  coins: (s: BoostSettings) => number
  reached: (m: MilestoneStats) => boolean
  progress: (m: MilestoneStats) => { current: number; target: number }
  labelKey: string
}

export const MILESTONE_TIERS: MilestoneTier[] = [
  {
    key: 'filled_7_in_row',
    coins: (s) => s.boost_milestone_7d,
    reached: (m) => m.daysFilledStreak >= 7,
    progress: (m) => ({ current: Math.min(m.daysFilledStreak, 7), target: 7 }),
    labelKey: 'kidBoost.milestone.filled7',
  },
  {
    key: 'filled_30_total',
    coins: (s) => s.boost_milestone_30d,
    reached: (m) => m.daysFilledTotal >= 30,
    progress: (m) => ({ current: Math.min(m.daysFilledTotal, 30), target: 30 }),
    labelKey: 'kidBoost.milestone.filled30',
  },
  {
    key: 'filled_100_total',
    coins: (s) => s.boost_milestone_100d,
    reached: (m) => m.daysFilledTotal >= 100,
    progress: (m) => ({ current: Math.min(m.daysFilledTotal, 100), target: 100 }),
    labelKey: 'kidBoost.milestone.filled100',
  },
  {
    key: 'streak_30',
    coins: (s) => s.boost_milestone_streak30,
    reached: (m) => m.bestAnyStreak >= 30,
    progress: (m) => ({ current: Math.min(m.bestAnyStreak, 30), target: 30 }),
    labelKey: 'kidBoost.milestone.streak30',
  },
]

// Russian plural helper (1 / 2-4 / 5+).
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
