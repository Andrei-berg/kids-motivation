import { describe, it, expect } from 'vitest'
import { buildSpend, priceFor, weekRangeOf, type SpendSection, type SpendExpense } from '@/lib/spend/summary'

const section: SpendSection = {
  id: 's1', name: 'Борьба', cost: 7000, start_date: '2026-08-01', end_date: null,
  is_active: true, created_at: '2026-08-01T00:00:00Z',
}
const sweets = (id: string, date: string, amount: number): SpendExpense => ({
  id, title: 'Мелочи', amount, date, section_id: null, period: null,
  category: { id: 'c1', name: 'Мелочи', icon: '🍦' },
})

describe('weekRangeOf', () => {
  it('returns Monday..Sunday', () => {
    expect(weekRangeOf('2026-09-24')).toEqual({ start: '2026-09-21', end: '2026-09-27' })
  })
})

describe('priceFor', () => {
  const changes = [{ section_id: 's1', effective_period: '2026-09', old_cost: 6500, new_cost: 7000 }]
  it('uses the old price before the change and the new one from it', () => {
    expect(priceFor(section, '2026-08', changes)).toBe(6500)
    expect(priceFor(section, '2026-09', changes)).toBe(7000)
  })
})

describe('buildSpend', () => {
  const changes = [{ section_id: 's1', effective_period: '2026-09', old_cost: 6500, new_cost: 7000 }]
  const expenses = [sweets('e1', '2026-09-22', 100), sweets('e2', '2026-09-23', 50), sweets('e3', '2026-08-30', 100)]

  it('month = section fee at the new price + this month\'s handouts', () => {
    const r = buildSpend({ sections: [section], expenses, priceChanges: changes, today: '2026-09-24', range: 'month' })
    expect(r.total).toBe(7150)
    expect(r.categories.map(c => c.key)).toEqual(['sections', 'c1'])
  })

  it('all = history keeps the old price for months before the change', () => {
    const r = buildSpend({ sections: [section], expenses, priceChanges: changes, today: '2026-09-24', range: 'all' })
    expect(r.total).toBe(6500 + 7000 + 250)
  })

  it('a saved month row wins over the price history', () => {
    const row: SpendExpense = { id: 'r', title: 'Борьба', amount: 6800, date: '2026-09-01', section_id: 's1', period: '2026-09', category: null }
    const r = buildSpend({ sections: [section], expenses: [row], priceChanges: changes, today: '2026-09-24', range: 'month' })
    expect(r.total).toBe(6800)
  })

  it('week prorates the monthly fee by days and is marked approximate', () => {
    const r = buildSpend({ sections: [section], expenses, priceChanges: changes, today: '2026-09-24', range: 'week' })
    // Mon 21 .. Thu 24 = 4 days of a 30-day month; handouts 100 + 50
    expect(r.approximate).toBe(true)
    expect(Math.round(r.total)).toBe(Math.round((7000 * 4) / 30 + 150))
  })

  it('archived sections only contribute saved rows', () => {
    const archived = { ...section, is_active: false }
    const r = buildSpend({ sections: [archived], expenses: [], today: '2026-09-24', range: 'all' })
    expect(r.total).toBe(0)
  })
})
