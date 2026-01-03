// Утилиты для работы с датами и расчетов (портировано из Code.gs)

/**
 * Нормализовать дату в формат YYYY-MM-DD
 */
export function normalizeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10)
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
