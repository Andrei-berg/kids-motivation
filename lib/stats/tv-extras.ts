// lib/stats/tv-extras.ts
// Extra TV-board data on top of family-stats: today's trainings and this month's
// spend per child. Spend uses buildSpend so the TV shows the same number as the
// kid banner. Service-role; caller must have authorised `familyId`.

import { addDays } from '@/utils/helpers'
import { buildSpend } from '@/lib/spend/summary'

export type TvTraining = { childId: string; title: string; start: string | null; end: string | null; location: string | null }
export type TvSpend = { childId: string; total: number; categories: { key: string; name: string; icon: string | null; amount: number }[] }
export type TvExtras = { today: string; trainings: TvTraining[]; spend: TvSpend[] }

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

export async function loadTvExtras(admin: any, familyId: string, childIds: string[], today: string): Promise<TvExtras> {
  if (!childIds.length) return { today, trainings: [], spend: [] }
  const isoDow = ((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7) + 1

  const [members, sched, sections, expenses, changes] = await Promise.all([
    admin.from('family_members').select('id, child_id').eq('family_id', familyId).in('child_id', childIds),
    admin.from('schedule').select('child_member_id,title,day_of_week,start_time,end_time,location,type,is_active')
      .eq('family_id', familyId).eq('type', 'section').eq('is_active', true),
    admin.from('sections').select('id, child_id, name, cost, start_date, end_date, is_active, created_at').eq('family_id', familyId).in('child_id', childIds),
    admin.from('expenses').select('id, child_id, title, amount, date, section_id, period, category:expense_categories(id, name, icon)')
      .eq('family_id', familyId).in('child_id', childIds).gte('date', today.slice(0, 7) + '-01'),
    admin.from('section_price_changes').select('child_id, section_id, effective_period, old_cost, new_cost').eq('family_id', familyId).in('child_id', childIds),
  ])

  const memberToChild = new Map<string, string>((members.data ?? []).map((m: any) => [m.id, m.child_id]))
  const trainings: TvTraining[] = (sched.data ?? [])
    .filter((s: any) => (s.day_of_week ?? []).includes(isoDow) && memberToChild.has(s.child_member_id))
    .map((s: any) => ({ childId: memberToChild.get(s.child_member_id)!, title: s.title, start: hhmm(s.start_time), end: hhmm(s.end_time), location: s.location ?? null }))
    .sort((a: TvTraining, b: TvTraining) => (a.start ?? '99').localeCompare(b.start ?? '99'))

  const spend: TvSpend[] = childIds.map(childId => {
    const s = buildSpend({
      sections: (sections.data ?? []).filter((x: any) => x.child_id === childId),
      expenses: (expenses.data ?? []).filter((e: any) => e.child_id === childId).map((e: any) => ({
        ...e, amount: Number(e.amount), category: Array.isArray(e.category) ? e.category[0] ?? null : e.category,
      })),
      priceChanges: changes.error ? [] : (changes.data ?? []).filter((c: any) => c.child_id === childId),
      today, range: 'month',
    })
    return { childId, total: s.total, categories: s.categories.slice(0, 4).map((c: any) => ({ key: c.key, name: c.name, icon: c.icon ?? null, amount: c.amount })) }
  })

  return { today, trainings, spend }
}
