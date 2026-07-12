import { describe, it, expect } from 'vitest'

import { getDayType } from '@/lib/day-type'
import type { VacationPeriod } from '@/lib/vacation-api'
import type { FamilyCalendar } from '@/lib/models/calendar.types'

function makeCalendar(overrides: Partial<FamilyCalendar> = {}): FamilyCalendar {
  return {
    id: 'cal-1',
    family_id: 'fam-1',
    year_start: '2026-09-01',
    year_end: '2027-05-31',
    term_mode: 'quarters',
    weekend_days: [0, 6],
    region_preset: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getDayType', () => {
  it('with no familyCalendar: Saturday and Sunday resolve to weekend, Tuesday resolves to school (D-08 legacy fallback)', () => {
    expect(getDayType('2026-04-04', false, []).type).toBe('weekend') // Saturday
    expect(getDayType('2026-04-05', false, []).type).toBe('weekend') // Sunday
    expect(getDayType('2026-04-07', false, []).type).toBe('school') // Tuesday
  })

  it('with a familyCalendar whose weekend_days = [5,6]: Friday resolves to weekend, Sunday resolves to school', () => {
    const calendar = makeCalendar({ weekend_days: [5, 6] })
    expect(getDayType('2026-04-03', false, [], undefined, undefined, calendar).type).toBe('weekend') // Friday
    expect(getDayType('2026-04-05', false, [], undefined, undefined, calendar).type).toBe('school') // Sunday
  })

  it('a date outside [year_start, year_end] resolves to vacation even on a weekday (D-07)', () => {
    const calendar = makeCalendar({ year_start: '2026-09-01', year_end: '2027-05-31' })
    const result = getDayType('2027-07-15', false, [], undefined, undefined, calendar) // Thursday
    expect(result.type).toBe('vacation')
  })

  it('isSick=true wins over everything, including a matching vacation period and out-of-year dates', () => {
    const calendar = makeCalendar({ year_start: '2026-09-01', year_end: '2027-05-31' })
    const period: VacationPeriod = {
      id: 'p1',
      family_id: 'fam-1',
      name: 'Summer',
      start_date: '2027-07-01',
      end_date: '2027-08-31',
      emoji: '☀️',
      child_filter: 'all',
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = getDayType('2027-07-15', true, [period], undefined, undefined, calendar)
    expect(result.type).toBe('sick')
  })

  it('an explicit matching vacation period still returns vacation with that period name/emoji (unchanged priority)', () => {
    const period: VacationPeriod = {
      id: 'p1',
      family_id: 'fam-1',
      name: 'Autumn break',
      start_date: '2026-04-01',
      end_date: '2026-04-10',
      emoji: '🍂',
      child_filter: 'all',
      created_at: '2026-01-01T00:00:00Z',
    }
    // 2026-04-07 is a Tuesday (would otherwise resolve to school)
    const result = getDayType('2026-04-07', false, [period])
    expect(result.type).toBe('vacation')
    expect(result.label).toBe('Autumn break')
    expect(result.emoji).toBe('🍂')
  })
})
