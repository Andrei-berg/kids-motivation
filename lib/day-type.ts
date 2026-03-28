// lib/day-type.ts
// Determines the type of a given day (school / weekend / vacation / sick)
// and provides coin calculation helpers for non-school activities.

import { VacationPeriod } from './vacation-api'

export type DayType = 'school' | 'weekend' | 'vacation' | 'sick'

export interface DayTypeInfo {
  type: DayType
  label: string
  emoji: string
  vacationPeriod?: VacationPeriod
}

/**
 * Returns the day type for a given date string (YYYY-MM-DD).
 * Priority: sick > vacation period > weekend > school day.
 */
export function getDayType(
  date: string,
  isSick: boolean,
  vacationPeriods: VacationPeriod[],
  childId?: string
): DayTypeInfo {
  if (isSick) {
    return { type: 'sick', label: 'Болеет', emoji: '🤒' }
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

  // Use noon to prevent DST timezone shifts from flipping the day
  const d = new Date(date + 'T12:00:00')
  const dow = d.getDay()
  if (dow === 0 || dow === 6) {
    return { type: 'weekend', label: 'Выходной', emoji: '📅' }
  }

  return { type: 'school', label: 'Учебный', emoji: '📚' }
}

/** True for days where reading/help/lessons apply instead of school grades */
export function isNonSchoolDay(type: DayType): boolean {
  return type === 'vacation' || type === 'weekend'
}

// ─── Coin calculators for non-school activities ───────────────────────────────

export function calcReadingCoins(pagesRead: number, minutesRead: number, bookFinished: boolean): number {
  let coins = 0
  if (pagesRead >= 20 || minutesRead >= 30) coins = 5
  else if (pagesRead >= 10 || minutesRead >= 15) coins = 3
  if (bookFinished) coins += 10
  return coins
}

export function calcExtraLessonsCoins(doneCount: number): number {
  return doneCount * 3
}

export function calcHomeHelpCoins(helped: boolean): number {
  return helped ? 3 : 0
}

/** Returns a human-readable hint for reading coins */
export function readingCoinHint(pages: number, minutes: number, finished: boolean): string {
  let base = ''
  if (pages >= 20 || minutes >= 30) base = `${minutes} мин / ${pages} стр → +5💰 (≥30 мин или ≥20 стр)`
  else if (pages >= 10 || minutes >= 15) base = `${minutes} мин / ${pages} стр → +3💰 (≥15 мин или ≥10 стр)`
  else base = `${minutes} мин / ${pages} стр → 0💰 (нужно ≥15 мин или ≥10 стр)`
  if (finished) base += ' + книга дочитана 🎉 +10💰'
  return base
}
