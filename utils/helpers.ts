// ============================================================================
// УТИЛИТЫ ДЛЯ ДАТ И РАСЧЕТОВ
// ============================================================================

/**
 * Нормализовать дату в формат YYYY-MM-DD
 */
export function normalizeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10)
}

/**
 * Calendar date (YYYY-MM-DD) in the family's timezone (UTC+3, Moscow).
 *
 * Use this instead of `new Date().toISOString().slice(0,10)` whenever you need
 * "today" / a local calendar date. Plain toISOString() returns the UTC date, so
 * between 00:00 and 03:00 local time it yields YESTERDAY — which made day-fills,
 * coin awards and "one per day" checks land on the wrong day. Shifting the
 * instant by +3h before taking the UTC date gives the correct family-local day
 * consistently on both the browser and the (UTC) server.
 */
const FAMILY_TZ_OFFSET_MIN = 3 * 60
export function localDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + FAMILY_TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10)
}

/**
 * ISO-8601 week key for a date, e.g. '2026-W29'. Weeks start Monday; week 1
 * is the week containing the year's first Thursday (standard ISO-8601 rule).
 * The returned year is the ISO week-year, which can differ from the
 * calendar year for dates near Jan 1 (e.g. Dec 31 can fall in week 1 of the
 * following ISO year, and Jan 1-3 can fall in the last week of the prior
 * ISO year). Used as the weekly allowance period key (D-09).
 */
export function isoWeekKey(date: Date): string {
  // Copy and normalize to midnight UTC so day-of-month arithmetic below is
  // unaffected by the local time-of-day component.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // ISO day-of-week: Monday=1 ... Sunday=7 (JS getUTCDay(): Sunday=0).
  const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  // Shift to the Thursday of this ISO week — the Thursday's calendar year
  // is always the correct ISO week-year.
  d.setUTCDate(d.getUTCDate() + (4 - isoDow))
  const isoWeekYear = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoWeekYear, 0, 1))
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${isoWeekYear}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * Получить понедельник текущей недели
 */
export function getMonday(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Воскресенье = 0
  d.setDate(d.getDate() + diff)
  return normalizeDate(d)
}

/**
 * Получить диапазон недели (понедельник - воскресенье)
 */
export function getWeekRange(date: Date | string): { start: string; end: string } {
  const start = getMonday(date)
  const d = new Date(start)
  d.setDate(d.getDate() + 6)
  return { start, end: normalizeDate(d) }
}

/**
 * Добавить дни к дате
 */
export function addDays(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return normalizeDate(d)
}

/**
 * Форматировать дату для отображения
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

/**
 * Форматировать дату с годом
 */
export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Форматировать диапазон дат
 */
export function formatWeekRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`
}

/**
 * Проверить, находится ли дата между двумя датами
 */
export function isBetween(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

/**
 * Получить массив дат в диапазоне
 */
export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  let current = new Date(start)
  const endDate = new Date(end)
  
  while (current <= endDate) {
    dates.push(normalizeDate(current))
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

/**
 * Получить название дня недели
 */
export function getDayName(dateStr: string, short: boolean = false): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const fullNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  return short ? names[day] : fullNames[day]
}

/**
 * Проверить, является ли дата сегодня
 */
export function isToday(dateStr: string): boolean {
  return dateStr === normalizeDate(new Date())
}

/**
 * Хеш для PIN кода (простой для демо)
 */
export function hashPin(pin: string): string {
  // В продакшене использовать bcrypt или similar
  return btoa(pin)
}

/**
 * Проверить PIN
 */
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash
}

// ============================================================================
// РАСЧЁТЫ И ГЕЙМИФИКАЦИЯ
// ============================================================================

/**
 * Рассчитать XP для уровня
 */
export function getXPForLevel(level: number): number {
  return level * 1000
}

/**
 * Рассчитать уровень по XP
 */
export function getLevelFromXP(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

/**
 * Получить прогресс до следующего уровня
 */
export function getLevelProgress(xp: number): {
  currentLevel: number
  xpInLevel: number
  xpNeeded: number
  progress: number
} {
  const currentLevel = getLevelFromXP(xp)
  const xpForCurrentLevel = getXPForLevel(currentLevel - 1)
  const xpForNextLevel = getXPForLevel(currentLevel)
  const xpInLevel = xp - xpForCurrentLevel
  const xpNeeded = xpForNextLevel - xpForCurrentLevel
  const progress = Math.floor((xpInLevel / xpNeeded) * 100)
  
  return {
    currentLevel,
    xpInLevel,
    xpNeeded,
    progress
  }
}

/**
 * Форматировать число с разделителями
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Форматировать валюту
 */
export function formatMoney(amount: number): string {
  return `${formatNumber(amount)} ₽`
}

/**
 * Рассчитать процент
 */
export function calculatePercentage(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Получить цвет по оценке
 */
export function getGradeColor(grade: number): string {
  switch (grade) {
    case 5: return '#10b981' // emerald-500
    case 4: return '#3b82f6' // blue-500
    case 3: return '#f59e0b' // amber-500
    case 2: return '#ef4444' // red-500
    default: return '#6b7280' // gray-500
  }
}

/**
 * Получить emoji по оценке
 */
export function getGradeEmoji(grade: number): string {
  switch (grade) {
    case 5: return '🌟'
    case 4: return '✅'
    case 3: return '⚠️'
    case 2: return '❌'
    default: return '➖'
  }
}

/**
 * Escape HTML
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Debounce функция
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Класснеймы условно
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
