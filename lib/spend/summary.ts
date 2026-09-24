// lib/spend/summary.ts
// Pure "how much has the family spent on this child" maths. No I/O — the API
// route hands over raw rows, both the kid banner and the parent panel render
// the result. Amounts are rubles (not coins).

export interface SpendSection {
  id: string
  name: string
  cost: number | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface SpendExpense {
  id: string
  title: string
  amount: number
  date: string
  section_id: string | null
  period: string | null
  category: { id: string; name: string; icon: string } | null
}

export interface SpendPriceChange {
  section_id: string
  effective_period: string
  old_cost: number | null
  new_cost: number
}

export type SpendRange = 'week' | 'month' | 'all'

export interface SpendItem {
  key: string
  title: string
  icon: string
  categoryKey: string
  amount: number
  date: string            // YYYY-MM-DD, for ordering
  /** true = monthly section fee prorated into a week (shown with ≈) */
  prorated: boolean
  expenseId: string | null
  sectionId: string | null
}

export interface SpendCategory {
  key: string
  name: string
  icon: string
  amount: number
  pct: number
}

export interface SpendSummary {
  total: number
  approximate: boolean
  categories: SpendCategory[]
  items: SpendItem[]
}

const SECTION_CAT = { key: 'sections', name: 'Секции', icon: '🏅' }
const MAX_MONTHS = 36

const pad = (n: number) => String(n).padStart(2, '0')
export const ymOf = (d: string) => d.slice(0, 7)
export const daysInMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function dateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Monday..Sunday range (YYYY-MM-DD, inclusive) containing `today`. */
export function weekRangeOf(today: string): { start: string; end: string } {
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // Mon=0
  const s = new Date(y, m - 1, d - dow)
  const e = new Date(y, m - 1, d - dow + 6)
  const f = (x: Date) => dateStr(x.getFullYear(), x.getMonth() + 1, x.getDate())
  return { start: f(s), end: f(e) }
}

export function monthRangeOf(today: string): { start: string; end: string } {
  const ym = ymOf(today)
  return { start: `${ym}-01`, end: `${ym}-${pad(daysInMonth(ym))}` }
}

function monthsBetween(startYM: string, endYM: string): string[] {
  const out: string[] = []
  let [y, m] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  while ((y < ey || (y === ey && m <= em)) && out.length < MAX_MONTHS) {
    out.push(`${y}-${pad(m)}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

/** Price a section had in `period`, from its logged changes (falls back to the current cost). */
export function priceFor(s: SpendSection, period: string, changes: SpendPriceChange[]): number {
  const mine = changes.filter(c => c.section_id === s.id)
    .sort((a, b) => (a.effective_period < b.effective_period ? -1 : 1))
  if (mine.length === 0) return Number(s.cost ?? 0)
  let price: number | null = null
  for (const c of mine) if (c.effective_period <= period) price = Number(c.new_cost)
  if (price != null) return price
  return Number(mine[0].old_cost ?? s.cost ?? 0)
}

/**
 * One virtual/real monthly fee per (section, month). Real rows (expenses with
 * section_id+period) win, so history keeps the price that was actually paid;
 * months with no row yet fall back to the section's current cost.
 */
function sectionMonthlyFees(
  sections: SpendSection[], expenses: SpendExpense[], changes: SpendPriceChange[], today: string,
): Array<{ sectionId: string; name: string; period: string; amount: number; expenseId: string | null }> {
  const curYM = ymOf(today)
  const real = new Map<string, SpendExpense>()
  for (const e of expenses) if (e.section_id && e.period) real.set(`${e.section_id}|${e.period}`, e)

  const out: ReturnType<typeof sectionMonthlyFees> = []
  const seen = new Set<string>()
  for (const s of sections) {
    // Archived sections only contribute their already-saved month rows (below).
    if (!s.is_active) continue
    const startYM = ymOf(s.start_date ?? s.created_at)
    let endYM = curYM
    if (s.end_date && ymOf(s.end_date) < endYM) endYM = ymOf(s.end_date)
    for (const p of monthsBetween(startYM, endYM)) {
      const r = real.get(`${s.id}|${p}`)
      const amount = r ? Number(r.amount) : priceFor(s, p, changes)
      if (amount > 0) {
        out.push({ sectionId: s.id, name: s.name, period: p, amount, expenseId: r?.id ?? null })
        seen.add(`${s.id}|${p}`)
      }
    }
  }
  // Real rows of sections that are no longer listed (deleted section keeps no rows; archived does).
  for (const [k, r] of Array.from(real.entries())) {
    if (seen.has(k) || !(Number(r.amount) > 0)) continue
    out.push({ sectionId: r.section_id!, name: r.title, period: r.period!, amount: Number(r.amount), expenseId: r.id })
  }
  return out
}

export function buildSpend(input: {
  sections: SpendSection[]
  expenses: SpendExpense[]
  priceChanges?: SpendPriceChange[]
  today: string
  range: SpendRange
}): SpendSummary {
  const { sections, expenses, today, range } = input
  const priceChanges = input.priceChanges ?? []
  const bounds = range === 'week' ? weekRangeOf(today) : range === 'month' ? monthRangeOf(today) : null
  const inRange = (d: string) => !bounds || (d >= bounds.start && d <= bounds.end)

  const items: SpendItem[] = []

  // One-off / manual expenses (everything that is not a materialised section fee).
  for (const e of expenses) {
    if (e.section_id) continue
    if (!inRange(e.date) || e.date > today) continue
    const cat = e.category
    items.push({
      key: `e:${e.id}`, title: e.title, icon: cat?.icon ?? '💸',
      categoryKey: cat?.id ?? 'none', amount: Number(e.amount), date: e.date,
      prorated: false, expenseId: e.id, sectionId: null,
    })
  }

  // Monthly section fees.
  let approximate = false
  for (const f of sectionMonthlyFees(sections, expenses, priceChanges, today)) {
    const monthStart = `${f.period}-01`
    let amount = f.amount
    let prorated = false
    let date = monthStart
    if (range === 'month') {
      if (f.period !== ymOf(today)) continue
    } else if (range === 'week') {
      // Share of the fee that falls into the week's days of this month.
      const dim = daysInMonth(f.period)
      let days = 0
      const w = bounds!
      for (let i = 1; i <= dim; i++) {
        const ds = dateStr(+f.period.slice(0, 4), +f.period.slice(5), i)
        if (ds >= w.start && ds <= w.end && ds <= today) days++
      }
      if (days === 0) continue
      amount = (f.amount * days) / dim
      prorated = true; approximate = true
      date = w.start
    } else if (f.period > ymOf(today)) continue
    items.push({
      key: `s:${f.sectionId}:${f.period}`, title: f.name, icon: SECTION_CAT.icon,
      categoryKey: SECTION_CAT.key, amount, date, prorated,
      expenseId: f.expenseId, sectionId: f.sectionId,
    })
  }

  items.sort((a, b) => (a.date === b.date ? b.amount - a.amount : a.date < b.date ? 1 : -1))

  const catMeta = new Map<string, { name: string; icon: string }>()
  catMeta.set(SECTION_CAT.key, { name: SECTION_CAT.name, icon: SECTION_CAT.icon })
  for (const e of expenses) if (e.category) catMeta.set(e.category.id, { name: e.category.name, icon: e.category.icon })

  const sums = new Map<string, number>()
  let total = 0
  for (const it of items) {
    sums.set(it.categoryKey, (sums.get(it.categoryKey) ?? 0) + it.amount)
    total += it.amount
  }
  const categories: SpendCategory[] = Array.from(sums.entries())
    .map(([key, amount]) => {
      const meta = catMeta.get(key) ?? { name: 'Другое', icon: '•' }
      return { key, name: meta.name, icon: meta.icon, amount, pct: total > 0 ? amount / total : 0 }
    })
    .sort((a, b) => b.amount - a.amount)

  return { total, approximate, categories, items }
}

/** "6 500 → 7 000 с сентября" lines for price changes that touch the visible window. */
export function describePriceChanges(
  changes: SpendPriceChange[], sections: SpendSection[],
): Array<{ sectionId: string; name: string; from: number | null; to: number; period: string }> {
  const names = new Map(sections.map(s => [s.id, s.name]))
  return changes
    .filter(c => names.has(c.section_id))
    .sort((a, b) => (a.effective_period < b.effective_period ? 1 : -1))
    .map(c => ({
      sectionId: c.section_id, name: names.get(c.section_id)!,
      from: c.old_cost, to: Number(c.new_cost), period: c.effective_period,
    }))
}

export const fmtRub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`
