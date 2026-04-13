'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPushToSubscription } from '@/app/actions/push'

/**
 * Shared push notification helper.
 * Looks up the child's member_id via family_members, then sends a push
 * notification to all of their registered subscriptions.
 *
 * Never throws — push failures are logged as warnings but must never
 * break the calling flow.
 *
 * @param childId  children.id (NOT family_members.id / member_id)
 * @param title    Notification title
 * @param body     Notification body
 * @param url      URL to open when notification is tapped (default: /kid/wallet)
 */
export async function notifyChild(
  childId: string,
  title: string,
  body: string,
  url: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // Resolve child_id → member_id via family_members
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('child_id', childId)
      .maybeSingle()

    if (!member) return // child not linked to a member yet — silent fail

    // Fetch all push subscriptions for this member
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('member_id', member.id)

    if (!subs || subs.length === 0) return

    await Promise.allSettled(
      subs.map(row =>
        sendPushToSubscription(JSON.stringify(row.subscription), title, body, url)
      )
    )
  } catch (err) {
    console.warn('[notifyChild]', err)
  }
}
