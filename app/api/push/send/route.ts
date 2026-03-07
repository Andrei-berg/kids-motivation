// app/api/push/send/route.ts
// POST endpoint for sending push notifications to a family member.
// Accepts: { memberId: string, title: string, body: string, url?: string }
// Used by: future cron job (Phase M2) to send scheduled reminders.
// Auth: requires Authorization header with CRON_SECRET (set in env).
//
// This is a stub in Phase 1.3. The route is wired and functional but
// scheduled cron triggering is Phase M2 infrastructure.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToSubscription } from '@/app/actions/push'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Simple auth guard: require CRON_SECRET header to prevent abuse
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: { memberId: string; title: string; body: string; url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { memberId, title, body: notifBody, url = '/dashboard' } = body
  if (!memberId || !title || !notifBody) {
    return NextResponse.json(
      { error: 'memberId, title, and body are required' },
      { status: 400 }
    )
  }

  // Fetch push subscriptions for this member from Supabase
  const supabase = await createClient()
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('member_id', memberId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscriptions found' })
  }

  // Send to all devices for this member
  const results = await Promise.allSettled(
    subscriptions.map((row) =>
      sendPushToSubscription(
        JSON.stringify(row.subscription),
        title,
        notifBody,
        url
      )
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ sent, failed })
}
