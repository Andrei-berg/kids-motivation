import { describe, it, expect } from 'vitest'
import {
  getPresetValues,
  defaultGradeCoinMap,
  GRADE_SCALE_VALUES,
  PRESET_IDS,
} from '@/lib/presets'

// D-02: the only fields a preset patch may ever touch.
const ALLOWED_FIELDS = new Set([
  'coins_per_grade_5',
  'coins_per_grade_4',
  'coins_per_grade_3',
  'coins_per_grade_2',
  'coins_per_grade_1',
  'coins_per_room_task',
  'coins_per_good_behavior',
  'coins_per_exercise',
  'coins_per_coach_5',
  'coins_per_coach_4',
  'coins_per_coach_3',
  'coins_per_coach_2',
  'coins_per_coach_1',
  'coins_per_book',
])

describe('getPresetValues', () => {
  it('classic returns the Classic value set', () => {
    expect(getPresetValues('classic')).toEqual({
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
    })
  })

  it('no_penalties floors negatives to 0, leaves positives unchanged', () => {
    const v = getPresetValues('no_penalties')
    expect(v.coins_per_grade_3).toBe(0)
    expect(v.coins_per_grade_2).toBe(0)
    expect(v.coins_per_grade_1).toBe(0)
    expect(v.coins_per_coach_2).toBe(0)
    expect(v.coins_per_coach_1).toBe(0)
    expect(v.coins_per_grade_5).toBe(10)
    expect(v.coins_per_grade_4).toBe(5)
    expect(v.coins_per_room_task).toBe(3)
    expect(v.coins_per_good_behavior).toBe(5)
    expect(v.coins_per_exercise).toBe(5)
    expect(v.coins_per_coach_5).toBe(10)
    expect(v.coins_per_coach_4).toBe(5)
    expect(v.coins_per_coach_3).toBe(0)
    expect(v.coins_per_book).toBe(20)
  })

  it('D-01: no_penalties and bonuses_only are numerically identical (one value set, two labels)', () => {
    expect(getPresetValues('no_penalties')).toEqual(getPresetValues('bonuses_only'))
  })

  it('classic is not equal to no_penalties', () => {
    expect(getPresetValues('classic')).not.toEqual(getPresetValues('no_penalties'))
  })

  it('D-02 scope: every preset patch touches only the allowed field list, never streak_*/base_exchange_rate/p2p_*', () => {
    for (const id of PRESET_IDS) {
      const patch = getPresetValues(id)
      for (const key of Object.keys(patch)) {
        expect(ALLOWED_FIELDS.has(key)).toBe(true)
        expect(key.startsWith('streak_')).toBe(false)
        expect(key).not.toBe('base_exchange_rate')
        expect(key.startsWith('p2p_')).toBe(false)
      }
    }
  })
})

describe('GRADE_SCALE_VALUES', () => {
  it('five_point has values 5..1', () => {
    expect(GRADE_SCALE_VALUES.five_point).toEqual(['5', '4', '3', '2', '1'])
  })

  it('twelve_point has values 12..1', () => {
    expect(GRADE_SCALE_VALUES.twelve_point).toEqual([
      '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1',
    ])
  })

  it('a_f has values A..F', () => {
    expect(GRADE_SCALE_VALUES.a_f).toEqual(['A', 'B', 'C', 'D', 'F'])
  })
})

describe('defaultGradeCoinMap', () => {
  it('five_point keys are exactly 5,4,3,2,1', () => {
    expect(Object.keys(defaultGradeCoinMap('five_point'))).toEqual(['5', '4', '3', '2', '1'])
  })

  it('twelve_point keys are exactly 12..1', () => {
    expect(Object.keys(defaultGradeCoinMap('twelve_point'))).toEqual([
      '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1',
    ])
  })

  it('a_f keys are exactly A,B,C,D,F', () => {
    expect(Object.keys(defaultGradeCoinMap('a_f'))).toEqual(['A', 'B', 'C', 'D', 'F'])
  })
})
