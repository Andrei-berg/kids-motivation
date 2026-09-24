// lib/stats/family-stats.ts
// One aggregation for every statistics surface (Parent Center Analytics, the TV
// board). Pure builders + one service-role loader. Money figures come from
// wallet_transactions (the ledger), NOT from getWeekScore's hardcoded formula.

import { addDays } from '@/utils/helpers'

export type DayStat = {
  date: string
  coinsIn: number        // sum of positive coins_change
  coinsOut: number       // sum of |negative coins_change|
  filled: boolean        // a `days` row exists
  roomOk: boolean
  goodBehavior: boolean
  grades: number[]
}

export type WeekStat = { start: string; avg: number | null; count: number; coins: number }
export type SubjectStat = { subject: string; avg: number; count: number; trend: number | null }

export type ChildStats = {
  childId: string
  name: string
  emoji: string
  avatarUrl: string | null
  level: number
  balance: number
  streak: { current: number; best: number }
  days: DayStat[]        // oldest → newest, exactly `range` entries
  weeks: WeekStat[]      // oldest → newest, calendar weeks (Mon) inside the range
  subjects: SubjectStat[]
  totals: { earned: number; spent: number; gradeAvg: number | null; gradeCount: number; filledDays: number; cleanDays: number }
}

export type FeedItem = { id: string; childId: string | null; kind: string; title: string; amount: number | null; icon: string | null; at: string }

export type FamilyStats = { generatedAt: string; range: number; children: ChildStats[]; feed: FeedItem[] }

type TxRow = { child_id: string; coins_change: number | null; created_at: string }
type DayRow = { child_id: string; date: string; room_ok: boolean | null; good_behavior: boolean | null }
type GradeRow = { child_id: string; date: string; subject: string; grade: number | string }
type ChildRow = { id: string; name: string; emoji: string; avatar_url?: string | null; level: number | null }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10)

/** Monday (YYYY-MM-DD) of the week containing `date`. */
export function mondayOf(date: string): string {
  const d = new Date(date + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7
  return addDays(date, -dow)
}

/** Local calendar date of a timestamp in the given IANA zone. */
export function dateInZone(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

export function buildChildStats(input: {
  child: ChildRow
  today: string
  range: number
  tz: string
  txs: TxRow[]
  days: DayRow[]
  grades: GradeRow[]
  balance: number
  streak: { current: number; best: number }
}): ChildStats {
  const { child, today, range, tz } = input
  const dates: string[] = Array.from({ length: range }, (_, i) => addDays(today, i - (range - 1)))
  const byDate = new Map<string, DayStat>(dates.map(d => [d, {
    date: d, coinsIn: 0, coinsOut: 0, filled: false, roomOk: false, goodBehavior: false, grades: [],
  }]))

  for (const t of input.txs) {
    const s = byDate.get(dateInZone(t.created_at, tz))
    const c = Number(t.coins_change ?? 0)
    if (!s || !c) continue
    if (c > 0) s.coinsIn += c; else s.coinsOut += -c
  }
  for (const r of input.days) {
    const s = byDate.get(r.date)
    if (!s) continue
    s.filled = true; s.roomOk = !!r.room_ok; s.goodBehavior = !!r.good_behavior
  }
  // subject_grades.grade comes back as TEXT from prod ('5'), so coerce; drop junk.
  const grades = input.grades.map(g => ({ ...g, grade: Number(g.grade) })).filter(g => g.grade >= 1 && g.grade <= 5)
  for (const g of grades) byDate.get(g.date)?.grades.push(g.grade)

  const days = dates.map(d => byDate.get(d)!)

  // Calendar weeks (Mon-based) covered by the range.
  const weekMap = new Map<string, { grades: number[]; coins: number }>()
  for (const s of days) {
    const k = mondayOf(s.date)
    const w = weekMap.get(k) ?? { grades: [], coins: 0 }
    w.grades.push(...s.grades); w.coins += s.coinsIn
    weekMap.set(k, w)
  }
  const weeks: WeekStat[] = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([start, w]) => ({ start, avg: round1(avg(w.grades)), count: w.grades.length, coins: w.coins }))

  // Subjects: average over the range; trend = 2nd half avg − 1st half avg.
  const mid = dates[Math.floor(dates.length / 2)]
  const subj = new Map<string, { all: number[]; a: number[]; b: number[] }>()
  for (const g of grades) {
    if (!byDate.has(g.date)) continue
    const e = subj.get(g.subject) ?? { all: [], a: [], b: [] }
    e.all.push(g.grade); (g.date < mid ? e.a : e.b).push(g.grade)
    subj.set(g.subject, e)
  }
  const subjects: SubjectStat[] = Array.from(subj.entries()).map(([subject, e]) => ({
    subject, avg: round1(avg(e.all))!, count: e.all.length,
    trend: e.a.length && e.b.length ? round1(avg(e.b)! - avg(e.a)!) : null,
  })).sort((x, y) => y.count - x.count)

  const allGrades = days.flatMap(d => d.grades)
  return {
    childId: child.id, name: child.name, emoji: child.emoji, avatarUrl: child.avatar_url ?? null,
    level: child.level ?? 1, balance: input.balance, streak: input.streak,
    days, weeks, subjects,
    totals: {
      earned: days.reduce((a, d) => a + d.coinsIn, 0),
      spent: days.reduce((a, d) => a + d.coinsOut, 0),
      gradeAvg: round1(avg(allGrades)), gradeCount: allGrades.length,
      filledDays: days.filter(d => d.filled).length,
      cleanDays: days.filter(d => d.filled && d.roomOk && d.goodBehavior).length,
    },
  }
}

/** Service-role loader. Caller MUST have authorised `familyId` already. */
export async function loadFamilyStats(admin: any, familyId: string, range: number, opts?: { tz?: string; feed?: number }): Promise<FamilyStats> {
  const tz = opts?.tz ?? 'Europe/Moscow'
  const today = dateInZone(new Date().toISOString(), tz)
  const from = addDays(today, -(range - 1))
  // 1 day of slack on each side of the ledger window so tz edges never drop rows.
  const fromTs = addDays(from, -1) + 'T00:00:00Z'

  const { data: kids, error: kidsErr } = await admin.from('children')
    .select('id,name,emoji,level,active').eq('family_id', familyId).order('created_at')
  if (kidsErr) throw kidsErr
  const children: ChildRow[] = (kids ?? []).filter((k: any) => k.active !== false)
  const ids = children.map(c => c.id)
  if (!ids.length) return { generatedAt: new Date().toISOString(), range, children: [], feed: [] }

  const [tx, dy, gr, wl, st, ev] = await Promise.all([
    admin.from('wallet_transactions').select('child_id,coins_change,created_at').in('child_id', ids).gte('created_at', fromTs).limit(5000),
    admin.from('days').select('child_id,date,room_ok,good_behavior').in('child_id', ids).gte('date', from).lte('date', today),
    admin.from('subject_grades').select('child_id,date,subject,grade').in('child_id', ids).gte('date', from).lte('date', today),
    admin.from('wallet').select('child_id,coins').in('child_id', ids),
    admin.from('streaks').select('child_id,current_count,best_count').in('child_id', ids),
    admin.from('family_events').select('id,child_id,kind,title,amount,icon,created_at').eq('family_id', familyId)
      .order('created_at', { ascending: false }).limit(opts?.feed ?? 12),
  ])

  const group = <T extends { child_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>(); for (const r of rows ?? []) (m.get(r.child_id) ?? m.set(r.child_id, []).get(r.child_id)!).push(r); return m
  }
  const txG = group<TxRow>(tx.data), dyG = group<DayRow>(dy.data), grG = group<GradeRow>(gr.data)
  const bal = new Map<string, number>((wl.data ?? []).map((w: any) => [w.child_id, Number(w.coins ?? 0)]))
  const stG = group<any>(st.data)

  return {
    generatedAt: new Date().toISOString(), range,
    children: children.map(c => {
      const ss = stG.get(c.id) ?? []
      return buildChildStats({
        child: c, today, range, tz,
        txs: txG.get(c.id) ?? [], days: dyG.get(c.id) ?? [], grades: grG.get(c.id) ?? [],
        balance: bal.get(c.id) ?? 0,
        streak: { current: Math.max(0, ...ss.map((s: any) => s.current_count ?? 0)), best: Math.max(0, ...ss.map((s: any) => s.best_count ?? 0)) },
      })
    }),
    feed: (ev.data ?? []).map((e: any) => ({ id: e.id, childId: e.child_id, kind: e.kind, title: e.title, amount: e.amount, icon: e.icon, at: e.created_at })),
  }
}
