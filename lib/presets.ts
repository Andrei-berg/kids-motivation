// lib/presets.ts
// Rule-presets lookup table (Phase 5.9 Plan 02, D-01/D-02).
//
// Shared verbatim by the Settings "Apply preset" flow and the onboarding
// preset step — both call getPresetValues(id) rather than branching on the
// preset id themselves (05.9-RESEARCH.md Pattern 1).
//
// D-01: there are only TWO underlying numeric value sets behind THREE UI
// cards — 'no_penalties' and 'bonuses_only' are numerically identical
// (negatives floored to 0); they exist as separate cards purely for framing.
//
// D-02 scope: the preset patch object touches ONLY grade coins (1-5),
// coins_per_room_task, coins_per_good_behavior, coins_per_exercise, coach
// ratings (1-5), and coins_per_book — never any streak setting, the coin
// exchange rate, or any peer-to-peer transfer limit. A preset must never
// silently overwrite settings a family configured separately from the
// coin-rules the preset controls.

import type { WalletSettings } from '@/lib/models/wallet.types'

export type PresetId = 'classic' | 'no_penalties' | 'bonuses_only'

export type GradeScale = 'five_point' | 'twelve_point' | 'a_f'

// Classic numeric values — mirrors app/api/wallet/_lib.ts SETTINGS_DEFAULTS
// for the same fields (the Classic preset IS the historical default).
const CLASSIC: Partial<WalletSettings> = {
  coins_per_grade_5: 10,
  coins_per_grade_4: 5,
  coins_per_grade_3: -3,
  coins_per_grade_2: -5,
  coins_per_grade_1: -10,
  coins_per_room_task: 3,
  coins_per_good_behavior: 5,
  coins_per_exercise: 5,
  coins_per_coach_5: 10,
  coins_per_coach_4: 5,
  coins_per_coach_3: 0,
  coins_per_coach_2: -3,
  coins_per_coach_1: -10,
  coins_per_book: 20,
}

// D-01: 'no_penalties' and 'bonuses_only' share this exact value set —
// every negative in CLASSIC floored to 0, positives unchanged.
const NO_PENALTY_VALUES: Partial<WalletSettings> = {
  ...CLASSIC,
  coins_per_grade_3: 0,
  coins_per_grade_2: 0,
  coins_per_grade_1: 0,
  coins_per_coach_2: 0,
  coins_per_coach_1: 0,
}

/** Ids for the UI to map over when rendering the three preset cards. */
export const PRESET_IDS: PresetId[] = ['classic', 'no_penalties', 'bonuses_only']

/**
 * Returns the fixed Partial<WalletSettings> patch for a preset id.
 * D-01: 'no_penalties' and 'bonuses_only' return the SAME object reference
 * (NO_PENALTY_VALUES) — they are one value set behind two labels.
 * D-02: the returned object only ever contains the field list above —
 * never streak, exchange-rate, or peer-to-peer transfer fields.
 */
export function getPresetValues(id: PresetId): Partial<WalletSettings> {
  if (id === 'classic') return CLASSIC
  return NO_PENALTY_VALUES // 'no_penalties' | 'bonuses_only'
}

/** Ordered value lists per grade scale — drives the grade-entry UI and grade_coin_map defaults. */
export const GRADE_SCALE_VALUES: Record<GradeScale, string[]> = {
  five_point: ['5', '4', '3', '2', '1'],
  twelve_point: ['12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
  a_f: ['A', 'B', 'C', 'D', 'F'],
}

/**
 * Default coin value per grade value, keyed by grade scale. Used to seed
 * grade_coin_map when a family switches scales or has none set yet.
 */
export function defaultGradeCoinMap(scale: GradeScale): Record<string, number> {
  switch (scale) {
    case 'five_point':
      return { '5': 10, '4': 5, '3': -3, '2': -5, '1': -10 }
    case 'twelve_point':
      return {
        '12': 12,
        '11': 10,
        '10': 8,
        '9': 6,
        '8': 4,
        '7': 2,
        '6': 0,
        '5': -2,
        '4': -4,
        '3': -6,
        '2': -8,
        '1': -10,
      }
    case 'a_f':
      return { A: 10, B: 5, C: 0, D: -5, F: -10 }
  }
}
