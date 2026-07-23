// app/api/cron/daily/route.ts
// Vercel Cron: runs once/day (scheduled in vercel.json, Plan 03) — three
// schedule-driven child reminder checks (SC3, D-10 daily cadence, Vercel
// Hobby budget) plus scheduled allowance crediting (SC1):
//   1. Upcoming section training today
//   2. Day not filled yet today
//   3. An active streak with no contribution today (not transparent)
//   4. Scheduled allowance credit for children whose weekly/monthly anchor
//      matches today (D-06/D-07/D-08), idempotent per period via creditAwards
//      (D-09)
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
import { localDateString, isoWeekKey } from '@/utils/helpers'
import { getStreaksAtRisk } from '@/lib/services/streaks.service'
import { creditAwards } from '@/app/api/wallet/_lib'

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
    return NextResponse.json({
      sent: 0,
      failed: 0,
      sections: 0,
      unfilled: 0,
      streaksAtRisk: 0,
      allowanceCredited: 0,
    })
  }

  const memberIds = childMembers.map((m) => m.id)
  const childIds = childMembers.map((m) => m.child_id).filter((id): id is string => Boolean(id))

  const pushItems: PushItem[] = []
  let sections = 0
  let unfilled = 0
  let streaksAtRisk = 0
  let allowanceCredited = 0

  // (1) Upcoming section training today.
  // NOTE: the `cs` (contains) operator on a Postgres array column expects
  // Postgres array literal syntax ("{3}"), not JSON syntax ("[3]") — passing
  // JSON.stringify() here causes PostgREST to reject the filter with a
  // "malformed array literal" error every time.
  const { data: sectionItems, error: sectionItemsError } = await admin
    .from('schedule_items')
    .select('child_member_id, title, start_time')
    .eq('type', 'section')
    .eq('is_active', true)
    .not('start_time', 'is', null)
    .filter('day_of_week', 'cs', `{${todayDow}}`)
    .in('child_member_id', memberIds)
  if (sectionItemsError) {
    console.error('[cron/daily] schedule_items query failed:', sectionItemsError)
  }

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
  // Per-child try/catch: one child's exception must not drop this check (or
  // the checks after it, incl. allowance crediting + push send) for everyone.
  for (const m of childMembers) {
    if (!m.child_id) continue
    try {
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
    } catch (err) {
      console.error(`[cron/daily] getStreaksAtRisk failed for child ${m.child_id}:`, err)
    }
  }

  // (4) Scheduled allowance credit (SC1). A child with no allowance_period
  // configured is never credited — the query below only selects children
  // with allowance_period IS NOT NULL and a positive allowance_amount
  // (D-08: on/off only, no pause control). Idempotency (re-run safety,
  // overlapping cron invocations) is fully handled by creditAwards' own
  // (child_id, 'allowance', periodKey) pre-check + unique-index backstop
  // (D-09, T-0510-09) — no bespoke idempotency query is added here.
  const { data: allowanceChildren } =
    childIds.length > 0
      ? await admin
          .from('children')
          .select('id, allowance_amount, allowance_period, allowance_anchor')
          .in('id', childIds)
          .not('allowance_period', 'is', null)
          .gt('allowance_amount', 0)
      : {
          data: [] as {
            id: string
            allowance_amount: number
            allowance_period: string
            allowance_anchor: number | null
          }[],
        }

  // Derive today's day-of-month + the current month's length from the
  // family-local `today` string (avoids re-deriving local-time components
  // from a raw Date, which is what the pre-existing todayDow above already
  // does for the section-reminder check).
  const [todayYearStr, todayMonthStr, todayDayStr] = today.split('-')
  const todayYear = Number(todayYearStr)
  const todayMonth = Number(todayMonthStr)
  const todayDay = Number(todayDayStr)
  // Date.UTC(year, month, 0) rolls back to the last day of the PRIOR month
  // when `month` is 0-indexed — passing the 1-indexed todayMonth here lands
  // on the last day of the CURRENT month.
  const daysInTodayMonth = new Date(Date.UTC(todayYear, todayMonth, 0)).getUTCDate()

  for (const ac of allowanceChildren ?? []) {
    if (ac.allowance_anchor == null) continue

    let eligible = false
    let periodKey = ''
    if (ac.allowance_period === 'weekly') {
      // No proration for a mid-period-added child (D-07): eligibility is
      // purely today's anchor match, nothing else.
      eligible = ac.allowance_anchor === todayDow
      periodKey = isoWeekKey(now)
    } else if (ac.allowance_period === 'monthly') {
      // Clamp: an anchor beyond the current month's length (e.g. 31 in a
      // 30-day month) fires on the month's LAST day instead of never firing.
      const effectiveAnchorDay = Math.min(ac.allowance_anchor, daysInTodayMonth)
      eligible = todayDay === effectiveAnchorDay
      periodKey = today.slice(0, 7) // YYYY-MM
    }
    if (!eligible) continue

    // Per-child try/catch: one child's creditAwards failure (e.g. a missing
    // wallet row) must not abort allowance crediting for the rest of the
    // family base, nor skip the push-send step below.
    try {
      const { creditedCoins } = await creditAwards(admin, ac.id, [
        {
          coins: ac.allowance_amount,
          description: 'Пособие',
          icon: '💰',
          sourceType: 'allowance',
          sourceId: periodKey,
        },
      ])
      if (creditedCoins > 0) {
        allowanceCredited++
        const member = childMembers.find((m) => m.child_id === ac.id)
        if (member) {
          pushItems.push({
            memberId: member.id,
            title: 'Пособие зачислено',
            body: `+${creditedCoins} 🪙`,
            url: '/kid/wallet',
          })
        }
      }
    } catch (err) {
      console.error(`[cron/daily] creditAwards (allowance) failed for child ${ac.id}:`, err)
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

  return NextResponse.json({ sent, failed, sections, unfilled, streaksAtRisk, allowanceCredited })
}
