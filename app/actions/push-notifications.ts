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

/**
 * Send a push notification to all PARENT members of a family.
 * Used when a child takes an action requiring parent attention (e.g. shop request).
 *
 * Never throws — push failures are logged as warnings but must never
 * break the calling flow.
 *
 * @param familyId  families.id (UUID)
 * @param title     Notification title
 * @param body      Notification body
 * @param url       URL to open when notification is tapped (default: /parent-center)
 */
export async function notifyParent(
  familyId: string,
  title: string,
  body: string,
  url: string = '/parent-center'
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get all parent member IDs for this family
    const { data: parents } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('role', 'parent')

    if (!parents || parents.length === 0) return

    const parentMemberIds = parents.map((p) => p.id)

    // Fetch all push subscriptions for these parents
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('member_id', parentMemberIds)

    if (!subs || subs.length === 0) return

    await Promise.allSettled(
      subs.map((row) =>
        sendPushToSubscription(JSON.stringify(row.subscription), title, body, url)
      )
    )
  } catch (err) {
    console.warn('[notifyParent]', err)
  }
}
