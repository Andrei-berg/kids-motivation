// app/api/cron/reminders/route.ts
// NOTE: NOT scheduled — removed from vercel.json (feature dropped for now). The
// logic below assumes a 5-minute polling window, which needs a */5 cron (Vercel
// Pro). Kept intact so the feature can be re-enabled later by adding the cron
// back (schedule "*/5 * * * *") on a plan that allows it.
// Sends push notifications for schedule items whose reminder time is now (±5 min window)
// Auth: Vercel Cron sends Authorization: Bearer CRON_SECRET automatically
// TODO: Phase 4.3+ — localize push notification strings based on family language preference stored in DB

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscription } from '@/app/actions/push'
import { assertCronAuth } from '@/lib/cron-auth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = assertCronAuth(request)
  if (denied) return denied

  // Cron runs with no user session — use the service-role client so reads are
  // not silently filtered to zero rows by the "TO authenticated" RLS policies.
  const supabase = createAdminClient()
  const now = new Date()

  // Day of week: JS getDay() returns 0=Sun, need 1=Mon..7=Sun
  const jsDay = now.getDay()
  const todayDow = jsDay === 0 ? 7 : jsDay

  // Current time in minutes (UTC)
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  // Fetch active schedule items with reminders enabled
  const { data: items, error } = await supabase
    .from('schedule_items')
    .select('id, child_member_id, title, type, start_time, reminder_offset, day_of_week')
    .eq('has_reminder', true)
    .eq('is_active', true)
    .not('start_time', 'is', null)

  if (error) {
    console.error('cron/reminders: fetch error', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0 })
  }

  // Filter to items scheduled for today and due in the reminder window
  const dueItems = items.filter(item => {
    // Check day of week
    if (!item.day_of_week.includes(todayDow)) return false

    // Parse start_time "HH:MM:SS" → minutes
    const parts = (item.start_time as string).split(':')
    const startMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1])

    // Reminder fires at: startMinutes - reminder_offset
    const reminderMinutes = startMinutes - (item.reminder_offset ?? 15)

    // Window: [reminderMinutes - 4, reminderMinutes] (5-min window, cron every 5 min)
    return nowMinutes >= reminderMinutes - 4 && nowMinutes <= reminderMinutes
  })

  if (dueItems.length === 0) {
    return NextResponse.json({ sent: 0, checked: items.length })
  }

  // Collect member IDs to fetch subscriptions in one query
  const memberIds = Array.from(new Set(dueItems.map(i => i.child_member_id)))
  const { data: allSubs } = await supabase
    .from('push_subscriptions')
    .select('member_id, subscription')
    .in('member_id', memberIds)

  const subsByMember = new Map<string, string[]>()
  for (const sub of allSubs ?? []) {
    const existing = subsByMember.get(sub.member_id) ?? []
    existing.push(JSON.stringify(sub.subscription))
    subsByMember.set(sub.member_id, existing)
  }

  // Type labels
  const TYPE_LABELS: Record<string, string> = {
    lesson: 'Урок',
    section: 'Секция',
    routine: 'Задача',
  }

  const sends: Promise<void>[] = []
  for (const item of dueItems) {
    const subs = subsByMember.get(item.child_member_id) ?? []
    const label = TYPE_LABELS[item.type] ?? 'Задача'
    for (const subJson of subs) {
      sends.push(
        sendPushToSubscription(
          subJson,
          `${label} скоро начинается ⏰`,
          item.title,
          '/kid/day'
        )
      )
    }
  }

  const results = await Promise.allSettled(sends)
  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, checked: items.length, due: dueItems.length })
}
