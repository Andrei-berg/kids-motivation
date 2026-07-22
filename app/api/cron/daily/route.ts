// app/api/cron/daily/route.ts
// Vercel Cron: runs once/day (schedule wired in Plan 03) — three schedule-driven
// child reminder checks (SC3, D-10 daily cadence, Vercel Hobby budget):
//   1. Upcoming section training today
//   2. Day not filled yet today
//   3. An active streak with no contribution today (not transparent)
// Auth: CRON_SECRET header (assertCronAuth, fail-closed — T-0510-05).
// Recipients: the CHILD only — missed-tasks already nudges parents at 23:00 MSK
// about unfilled days; these child nudges run earlier so the child can still act.
// Minute-level schedule_items.reminder_offset is NOT honored (D-10) — section
// reminders fire once as a same-day heads-up, not a precise-time ping.
// TODO: Phase 4.3+ — localize push notification strings based on family language preference stored in DB

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/app/actions/push'
import { assertCronAuth } from '@/lib/cron-auth'
import { localDateString } from '@/utils/helpers'
import { getStreaksAtRisk } from '@/lib/services/streaks.service'

type PushItem = { memberId: string; title: string; body: string; url: string }

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = assertCronAuth(request)
  if (denied) return denied

  // Cron runs with no user session — use the service-role client so reads are
  // not silently filtered to zero rows by the "TO authenticated" RLS policies
  // (and so getStreaksAtRisk can read the RLS SELECT-only `streaks` table).
  const admin = createAdminClient()
  const now = new Date()
  const today = localDateString(now) // family-local (UTC+3) calendar day

  // Day of week: JS Sunday=0 → ISO Monday=1 … Sunday=7
  const jsDay = now.getDay()
  const todayDow = jsDay === 0 ? 7 : jsDay

  // ID mapping (CRITICAL): schedule_items.child_member_id and
  // push_subscriptions.member_id are family_members.id; days/streaks/children
  // are keyed by children.id (a per-family TEXT id). Resolve the link via
  // family_members rows (role='child'), which carry both ids.
  const { data: childMembers } = await admin
    .from('family_members')
    .select('id, child_id')
    .eq('role', 'child')

  if (!childMembers || childMembers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, sections: 0, unfilled: 0, streaksAtRisk: 0 })
  }

  const memberIds = childMembers.map((m) => m.id)
  const childIds = childMembers.map((m) => m.child_id).filter((id): id is string => Boolean(id))

  const pushItems: PushItem[] = []
  let sections = 0
  let unfilled = 0
  let streaksAtRisk = 0

  // (1) Upcoming section training today.
  const { data: sectionItems } = await admin
    .from('schedule_items')
    .select('child_member_id, title, start_time')
    .eq('type', 'section')
    .eq('is_active', true)
    .not('start_time', 'is', null)
    .filter('day_of_week', 'cs', JSON.stringify([todayDow]))
    .in('child_member_id', memberIds)

  for (const item of sectionItems ?? []) {
    const hhmm = (item.start_time as string).slice(0, 5) // strip seconds "HH:MM:SS" -> "HH:MM"
    pushItems.push({
      memberId: item.child_member_id,
      title: 'Секция сегодня',
      body: `${item.title} в ${hhmm}`,
      url: '/kid/day',
    })
    sections++
  }

  // (2) Day not filled by evening: no `days` row for (children.id, today).
  const { data: dayRows } =
    childIds.length > 0
      ? await admin.from('days').select('child_id').eq('date', today).in('child_id', childIds)
      : { data: [] as { child_id: string }[] }
  const filledChildIds = new Set((dayRows ?? []).map((d) => d.child_id))

  for (const m of childMembers) {
    if (!m.child_id) continue
    if (!filledChildIds.has(m.child_id)) {
      pushItems.push({
        memberId: m.id,
        title: 'Заполни свой день сегодня 📝',
        body: '',
        url: '/kid/day',
      })
      unfilled++
    }
  }

  // (3) Streak about to expire — read-only via getStreaksAtRisk (D-12: streaks
  // is RLS SELECT-only for clients; this never writes).
  for (const m of childMembers) {
    if (!m.child_id) continue
    const atRisk = await getStreaksAtRisk(admin, m.child_id, today)
    for (const s of atRisk) {
      pushItems.push({
        memberId: m.id,
        title: 'Серия под угрозой',
        body: `${s.current_count} дней`,
        url: '/kid/day',
      })
      streaksAtRisk++
    }
  }

  // Resolve child push subscriptions and send — one Promise.allSettled batch
  // across all three checks. NEVER notifyChild/notifyParent here: those use a
  // session-bound client that returns 0 rows in cron context (T-0510-06).
  const targetMemberIds = Array.from(new Set(pushItems.map((p) => p.memberId)))
  const { data: subs } =
    targetMemberIds.length > 0
      ? await admin.from('push_subscriptions').select('member_id, subscription').in('member_id', targetMemberIds)
      : { data: [] as { member_id: string; subscription: unknown }[] }

  const subsByMember = new Map<string, string[]>()
  for (const sub of subs ?? []) {
    const existing = subsByMember.get(sub.member_id) ?? []
    existing.push(JSON.stringify(sub.subscription))
    subsByMember.set(sub.member_id, existing)
  }

  const sends: Promise<void>[] = []
  for (const item of pushItems) {
    const subJsons = subsByMember.get(item.memberId) ?? []
    for (const subJson of subJsons) {
      sends.push(sendPushToSubscription(subJson, item.title, item.body, item.url))
    }
  }

  const results = await Promise.allSettled(sends)
  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, sections, unfilled, streaksAtRisk })
}
