// lib/day-type.ts
// Determines the type of a given day (school / weekend / vacation / sick)
// and provides coin calculation helpers for non-school activities.

import { VacationPeriod } from './vacation-api'
import type { FamilyCalendar } from './models/calendar.types'

export type DayType = 'school' | 'weekend' | 'vacation' | 'sick'

export interface DayTypeInfo {
  type: DayType
  label: string
  emoji: string
  vacationPeriod?: VacationPeriod
}

/**
 * Returns the day type for a given date string (YYYY-MM-DD).
 * Priority: sick > explicit vacation period > out-of-year-bounds (vacation) >
 * weekend > school day.
 *
 * `familyCalendar` is optional: when absent (or no family_calendar row exists
 * for the family — D-08), weekend resolution falls back to the hardcoded
 * Saturday/Sunday check and there is no school-year concept, matching the
 * pre-5.5 behavior exactly.
 */
export function getDayType(
  date: string,
  isSick: boolean,
  vacationPeriods: VacationPeriod[],
  childId?: string,
  t?: (key: string) => string,
  familyCalendar?: FamilyCalendar | null
): DayTypeInfo {
  if (isSick) {
    return { type: 'sick', label: t ? t('dayType.sick') : 'Болеет', emoji: '🤒' }
  }

  const period = vacationPeriods.find(p => {
    const matchChild = p.child_filter === 'all' || p.child_filter === childId
    return matchChild && date >= p.start_date && date <= p.end_date
  })

  if (period) {
    return {
      type: 'vacation',
      label: period.name,
      emoji: period.emoji,
      vacationPeriod: period,
    }
  }

  // Dates outside the family's configured school year auto-resolve to
  // vacation with no explicit period row required (D-07) — e.g. summer.
  // year_start/year_end may be NULL (row created by a preset-only upsert,
  // WR-07): skip the bounds rule until both are configured.
  if (
    familyCalendar &&
    familyCalendar.year_start &&
    familyCalendar.year_end &&
    (date < familyCalendar.year_start || date > familyCalendar.year_end)
  ) {
    return { type: 'vacation', label: t ? t('dayType.vacation') : 'Каникулы', emoji: '🏖️' }
  }

  // Use noon to prevent DST timezone shifts from flipping the day
  const d = new Date(date + 'T12:00:00')
  const dow = d.getDay()
  const isWeekend = familyCalendar ? familyCalendar.weekend_days.includes(dow) : dow === 0 || dow === 6
  if (isWeekend) {
    return { type: 'weekend', label: t ? t('dayType.weekend') : 'Выходной', emoji: '📅' }
  }

  return { type: 'school', label: t ? t('dayType.school') : 'Учебный', emoji: '📚' }
}

/** True for days where reading/help/lessons apply instead of school grades */
export function isNonSchoolDay(type: DayType): boolean {
  return type === 'vacation' || type === 'weekend'
}

// WR-05: the former coin calculators (calcReadingCoins, calcExtraLessonsCoins,
// calcHomeHelpCoins, readingCoinHint) were removed — they advertised hardcoded
// coin amounts that /api/wallet/award never credits. Coin values are per-family
// (wallet_settings) and computed server-side only.
