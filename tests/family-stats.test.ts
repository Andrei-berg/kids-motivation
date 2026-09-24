import { describe, it, expect } from 'vitest'
import { buildChildStats, mondayOf } from '@/lib/stats/family-stats'

const child = { id: 'c1', name: 'Адам', emoji: '🦊', level: 3 }
const base = { child, today: '2026-09-24', range: 7, tz: 'Europe/Moscow', balance: 10, streak: { current: 2, best: 5 } }

describe('buildChildStats', () => {
  it('buckets ledger rows by local day, splits earned/spent, ignores out-of-range', () => {
    const s = buildChildStats({
      ...base, days: [], grades: [],
      txs: [
        { child_id: 'c1', coins_change: 5, created_at: '2026-09-24T10:00:00Z' },
        { child_id: 'c1', coins_change: -3, created_at: '2026-09-24T11:00:00Z' },
        // 22:30Z on the 23rd is 01:30 MSK on the 24th
        { child_id: 'c1', coins_change: 7, created_at: '2026-09-23T22:30:00Z' },
        { child_id: 'c1', coins_change: 99, created_at: '2026-08-01T10:00:00Z' },
      ],
    })
    expect(s.days).toHaveLength(7)
    expect(s.days[6]).toMatchObject({ date: '2026-09-24', coinsIn: 12, coinsOut: 3 })
    expect(s.totals.earned).toBe(12)
  })

  it('computes grade averages, subject trend and clean days', () => {
    const s = buildChildStats({
      ...base, range: 14, txs: [],
      days: [{ child_id: 'c1', date: '2026-09-24', room_ok: true, good_behavior: true }],
      grades: [
        { child_id: 'c1', date: '2026-09-12', subject: 'Математика', grade: 3 },
        { child_id: 'c1', date: '2026-09-24', subject: 'Математика', grade: 5 },
      ],
    })
    expect(s.totals.gradeAvg).toBe(4)
    expect(s.subjects[0]).toMatchObject({ subject: 'Математика', avg: 4, trend: 2 })
    expect(s.totals.cleanDays).toBe(1)
  })

  it('mondayOf', () => {
    expect(mondayOf('2026-09-24')).toBe('2026-09-21')
    expect(mondayOf('2026-09-27')).toBe('2026-09-21')
  })
})

it('coerces TEXT grades from prod', () => {
  const s = buildChildStats({
    child: { id: 'c1', name: 'A', emoji: 'x', level: 1 }, today: '2026-09-24', range: 7, tz: 'Europe/Moscow', balance: 0,
    streak: { current: 0, best: 0 }, txs: [], days: [],
    grades: [{ child_id: 'c1', date: '2026-09-24', subject: 'М', grade: '5' }, { child_id: 'c1', date: '2026-09-24', subject: 'М', grade: '4' }],
  })
  expect(s.totals.gradeAvg).toBe(4.5)
})
