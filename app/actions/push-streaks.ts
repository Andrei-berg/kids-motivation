'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPushToSubscription } from '@/app/actions/push'
import type { StreakEvents } from '@/lib/services/streaks.service'

const STREAK_LABELS: Record<string, string> = {
  room: 'Комнаты',
  study: 'Учёбы',
  sport: 'Спорта',
}

export async function notifyStreakEvents(
  childId: string,
  childName: string,
  events: StreakEvents
): Promise<void> {
  if (events.broken.length === 0 && events.records.length === 0) return

  const supabase = await createClient()

  // Get child's push subscriptions.
  // childId here is family_members.id (member_id) — same as push_subscriptions.member_id.
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('member_id', childId)

  if (!subs || subs.length === 0) return

  const sends: Promise<void>[] = []

  for (const event of events.broken) {
    const label = STREAK_LABELS[event.type] ?? event.type
    sends.push(
      ...subs.map(row =>
        sendPushToSubscription(
          JSON.stringify(row.subscription),
          `Стрик прерван 😔`,
          `Стрик ${label} закончился на ${event.previousCount} дн.`,
          '/kid/achievements'
        )
      )
    )
  }

  for (const event of events.records) {
    const label = STREAK_LABELS[event.type] ?? event.type
    sends.push(
      ...subs.map(row =>
        sendPushToSubscription(
          JSON.stringify(row.subscription),
          `Новый рекорд! 🏆`,
          `${label}: ${event.newCount} дней подряд — личный рекорд!`,
          '/kid/achievements'
        )
      )
    )
  }

  await Promise.allSettled(sends)
}
