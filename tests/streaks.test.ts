import { describe, it, expect, vi } from 'vitest'

// Prevent Supabase client initialization (not needed for pure calc functions)
vi.mock('../lib/supabase', () => ({ supabase: {} }))

import {
  calculateRoomStreak,
  calculateStudyStreak,
  calculateSportStreak,
  calculateBehaviorStreak,
} from '../lib/services/streaks.service'
import type { DayType } from '../lib/day-type'

// Helper: build a consecutive day list ending on `today`
function makeDays(count: number, today: string, roomOk = true) {
  const days = []
  let current = today
  for (let i = 0; i < count; i++) {
    const d = new Date(current)
    d.setDate(d.getDate() - i)
    days.push({ date: d.toISOString().slice(0, 10), room_ok: roomOk })
  }
  return days
}

function makeGrades(dates: string[]) {
  return dates.map(date => ({ date }))
}

// Sport activity is now represented as a Set of sport-active dates (home exercises
// OR training attendance), matching calculateSportStreak's signature.
function makeSports(count: number, today: string): Set<string> {
  const sports = new Set<string>()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    sports.add(d.toISOString().slice(0, 10))
  }
  return sports
}

describe('calculateRoomStreak', () => {
  it('returns 0 when no days', () => {
    const result = calculateRoomStreak([], '2026-04-01')
    expect(result.current).toBe(0)
    expect(result.best).toBe(0)
  })

  it('counts consecutive room_ok days — current is the full run length ending today', () => {
    // CR-03: `current` is the length of the (transparency-bridged) run that
    // extends back from today — the full run length, not just 0/1.
    const today = '2026-04-01'
    const days = makeDays(5, today, true)
    const result = calculateRoomStreak(days, today)
    expect(result.current).toBe(5)   // full 5-day run ending today
    expect(result.best).toBe(5)
  })

  it('breaks streak when a day is not room_ok — current stops at the gap', () => {
    const today = '2026-04-01'
    const days = [
      { date: '2026-04-01', room_ok: true },
      { date: '2026-03-31', room_ok: true },
      { date: '2026-03-30', room_ok: false }, // gap
      { date: '2026-03-29', room_ok: true },
    ]
    const result = calculateRoomStreak(days, today)
    expect(result.current).toBe(2)   // run ending today: 04-01 + 03-31
    expect(result.best).toBe(2)      // longest run in window was 2
  })

  it('current is 0 when today is not room_ok', () => {
    const today = '2026-04-01'
    const days = [
      { date: '2026-04-01', room_ok: false },
      { date: '2026-03-31', room_ok: true },
      { date: '2026-03-30', room_ok: true },
    ]
    const result = calculateRoomStreak(days, today)
    expect(result.current).toBe(0)
    expect(result.best).toBe(2)
  })
})

describe('calculateStudyStreak', () => {
  it('returns 0 with no grades', () => {
    const result = calculateStudyStreak([], '2026-04-01')
    expect(result.current).toBe(0)
  })

  it('counts consecutive days that have grades — current is the full run length', () => {
    const today = '2026-04-01'
    const grades = makeGrades(['2026-04-01', '2026-03-31', '2026-03-30'])
    const result = calculateStudyStreak(grades, today)
    expect(result.current).toBe(3)   // full 3-day run ending today
    expect(result.best).toBe(3)
  })

  it('breaks when a day has no grades', () => {
    const today = '2026-04-01'
    // 2026-03-31 is missing → streak only 1
    const grades = makeGrades(['2026-04-01', '2026-03-30', '2026-03-29'])
    const result = calculateStudyStreak(grades, today)
    expect(result.current).toBe(1)
    expect(result.best).toBe(2)
  })
})

describe('calculateSportStreak', () => {
  it('returns 0 when no sports', () => {
    const result = calculateSportStreak(new Set<string>(), '2026-04-01')
    expect(result.current).toBe(0)
  })

  it('counts consecutive days with any sport activity — current is the full run length', () => {
    const today = '2026-04-01'
    const sports = makeSports(4, today)
    const result = calculateSportStreak(sports, today)
    expect(result.current).toBe(4)   // full 4-day run ending today
    expect(result.best).toBe(4)
  })

  it('a single sport-active day counts', () => {
    const today = '2026-04-01'
    const sports = new Set<string>(['2026-04-01'])
    const result = calculateSportStreak(sports, today)
    expect(result.current).toBe(1)
  })

  it('day not in the set does not count', () => {
    const today = '2026-04-01'
    const sports = new Set<string>(['2026-03-31']) // yesterday only
    const result = calculateSportStreak(sports, today)
    expect(result.current).toBe(0)
    expect(result.best).toBe(1)
  })
})

// Day-type transparency (D-09/D-10): a resolver that always returns 'school' must
// keep every legacy assertion above unchanged (it never trips a skip branch).
// A resolver returning 'weekend'/'vacation'/'sick' proves the transparency behavior:
// those days are skipped entirely — neither incrementing nor resetting a streak.
describe('day-type transparency', () => {
  const allSchool = (): DayType => 'school'

  it('a resolver that always returns school does not change calculateRoomStreak', () => {
    const today = '2026-04-01'
    const days = makeDays(5, today, true)
    const result = calculateRoomStreak(days, today, allSchool)
    expect(result.current).toBe(5)
    expect(result.best).toBe(5)
  })

  it('a resolver that always returns school does not change calculateStudyStreak', () => {
    const today = '2026-04-01'
    const grades = makeGrades(['2026-04-01', '2026-03-31', '2026-03-30'])
    const result = calculateStudyStreak(grades, today, allSchool)
    expect(result.current).toBe(3)
    expect(result.best).toBe(3)
  })

  it('study streak: a weekend gap is transparent — neither increments nor resets', () => {
    // 2026-04-04 is a Saturday. Grades exist on Fri 04-03 and Mon 04-06 with the
    // weekend (04-04, 04-05) skipped by the resolver — the streak must bridge the gap.
    const today = '2026-04-06'
    const grades = makeGrades(['2026-04-06', '2026-04-03'])
    const dayType = (dateStr: string): DayType =>
      dateStr === '2026-04-04' || dateStr === '2026-04-05' ? 'weekend' : 'school'
    const result = calculateStudyStreak(grades, today, dayType)
    expect(result.current).toBe(2)   // 04-06 + 04-03 bridged across the transparent weekend
    expect(result.best).toBe(2)
  })

  it('study streak: a vacation gap is transparent — neither increments nor resets', () => {
    const today = '2026-06-05'
    const grades = makeGrades(['2026-06-05', '2026-05-25'])
    const dayType = (dateStr: string): DayType =>
      dateStr > '2026-05-25' && dateStr < '2026-06-05' ? 'vacation' : 'school'
    const result = calculateStudyStreak(grades, today, dayType)
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('sick is transparent for the study streak', () => {
    const today = '2026-04-02'
    const grades = makeGrades(['2026-04-02', '2026-03-31'])
    const dayType = (dateStr: string): DayType => (dateStr === '2026-04-01' ? 'sick' : 'school')
    const result = calculateStudyStreak(grades, today, dayType)
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('sick is transparent for the room streak', () => {
    const today = '2026-04-02'
    const days = [
      { date: '2026-04-02', room_ok: true },
      { date: '2026-03-31', room_ok: true },
    ]
    const dayType = (dateStr: string): DayType => (dateStr === '2026-04-01' ? 'sick' : 'school')
    const result = calculateRoomStreak(days, today, dayType)
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('sick is transparent for the sport streak', () => {
    const today = '2026-04-02'
    const sports = new Set<string>(['2026-04-02', '2026-03-31'])
    const dayType = (dateStr: string): DayType => (dateStr === '2026-04-01' ? 'sick' : 'school')
    const result = calculateSportStreak(sports, today, dayType)
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('sick is transparent for the behavior streak', () => {
    const today = '2026-04-02'
    const days = [
      { date: '2026-04-02', good_behavior: true },
      { date: '2026-03-31', good_behavior: true },
    ]
    const dayType = (dateStr: string): DayType => (dateStr === '2026-04-01' ? 'sick' : 'school')
    const result = calculateBehaviorStreak(days, today, dayType)
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('a transparent TODAY carries the study streak through — current keeps the run (CR-02)', () => {
    // The save happens ON Saturday (transparent weekend): the run ending
    // Friday must be preserved — current stays at the full run length, it is
    // NOT zeroed (which used to emit a spurious streak-broken push).
    const today = '2026-04-04' // Saturday
    const grades = makeGrades(['2026-04-03', '2026-04-02', '2026-04-01'])
    const dayType = (dateStr: string): DayType =>
      dateStr === '2026-04-04' || dateStr === '2026-04-05' ? 'weekend' : 'school'
    const result = calculateStudyStreak(grades, today, dayType)
    expect(result.current).toBe(3)   // Fri+Thu+Wed run carried through the transparent today
    expect(result.best).toBe(3)
  })

  it('a sick TODAY carries the room streak through — current keeps the run (CR-02)', () => {
    const today = '2026-04-04'
    const days = [
      { date: '2026-04-03', room_ok: true },
      { date: '2026-04-02', room_ok: true },
    ]
    const dayType = (dateStr: string): DayType => (dateStr === '2026-04-04' ? 'sick' : 'school')
    const result = calculateRoomStreak(days, today, dayType)
    expect(result.current).toBe(2)   // run ending 04-03 carried through the sick today
    expect(result.best).toBe(2)
  })

  it('a weekend does NOT skip the room/sport/behavior calculators (only sick does)', () => {
    // Room/sport/behavior transparency is sick-only (D-09); weekend/vacation still
    // count as a normal day for those calculators, unlike the study streak.
    const today = '2026-04-02'
    const days = [
      { date: '2026-04-02', room_ok: true },
      { date: '2026-04-01', room_ok: false }, // weekend, not room_ok → breaks the streak
      { date: '2026-03-31', room_ok: true },
    ]
    const dayType = (dateStr: string): DayType => (dateStr === '2026-04-01' ? 'weekend' : 'school')
    const result = calculateRoomStreak(days, today, dayType)
    expect(result.current).toBe(1)
    expect(result.best).toBe(1) // 04-01 breaks the run; only today (04-02) is a fresh run of 1
  })
})
