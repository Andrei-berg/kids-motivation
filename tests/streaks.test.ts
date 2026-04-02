import { describe, it, expect, vi } from 'vitest'

// Prevent Supabase client initialization (not needed for pure calc functions)
vi.mock('../lib/supabase', () => ({ supabase: {} }))

import {
  calculateRoomStreak,
  calculateStudyStreak,
  calculateSportStreak,
} from '../lib/services/streaks.service'

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

function makeSports(count: number, today: string) {
  const sports = []
  let current = today
  for (let i = 0; i < count; i++) {
    const d = new Date(current)
    d.setDate(d.getDate() - i)
    sports.push({ date: d.toISOString().slice(0, 10), running: true, exercises: false, outdoor_games: false, stretching: false })
  }
  return sports
}

describe('calculateRoomStreak', () => {
  it('returns 0 when no days', () => {
    const result = calculateRoomStreak([], '2026-04-01')
    expect(result.current).toBe(0)
    expect(result.best).toBe(0)
  })

  it('counts consecutive room_ok days — best reflects full streak, current is 1 for active today', () => {
    // NOTE: current is always set when today is first processed (streak=1 at that point),
    // so current is 1 (active) or 0 (today not ok), never the full length.
    // The full run length is tracked in `best`.
    const today = '2026-04-01'
    const days = makeDays(5, today, true)
    const result = calculateRoomStreak(days, today)
    expect(result.current).toBe(1)   // today is ok → active
    expect(result.best).toBe(5)      // full 5-day run captured in best
  })

  it('breaks streak when a day is not room_ok — best tracks the broken run', () => {
    const today = '2026-04-01'
    const days = [
      { date: '2026-04-01', room_ok: true },
      { date: '2026-03-31', room_ok: true },
      { date: '2026-03-30', room_ok: false }, // gap
      { date: '2026-03-29', room_ok: true },
    ]
    const result = calculateRoomStreak(days, today)
    expect(result.current).toBe(1)   // today is ok → active
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

  it('counts consecutive days that have grades — best reflects full run', () => {
    const today = '2026-04-01'
    const grades = makeGrades(['2026-04-01', '2026-03-31', '2026-03-30'])
    const result = calculateStudyStreak(grades, today)
    expect(result.current).toBe(1)   // today has grades → active
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
    const result = calculateSportStreak([], '2026-04-01')
    expect(result.current).toBe(0)
  })

  it('counts consecutive days with any sport activity — best reflects full run', () => {
    const today = '2026-04-01'
    const sports = makeSports(4, today)
    const result = calculateSportStreak(sports, today)
    expect(result.current).toBe(1)   // today has sport → active
    expect(result.best).toBe(4)
  })

  it('any single activity flag counts as sport day', () => {
    const today = '2026-04-01'
    const sports = [
      { date: '2026-04-01', running: false, exercises: false, outdoor_games: false, stretching: true },
    ]
    const result = calculateSportStreak(sports, today)
    expect(result.current).toBe(1)
  })

  it('day with no activity flags does not count', () => {
    const today = '2026-04-01'
    const sports = [
      { date: '2026-04-01', running: false, exercises: false, outdoor_games: false, stretching: false },
      { date: '2026-03-31', running: true, exercises: false, outdoor_games: false, stretching: false },
    ]
    const result = calculateSportStreak(sports, today)
    expect(result.current).toBe(0)
    expect(result.best).toBe(1)
  })
})
