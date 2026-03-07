// lib/push-api.ts
// Browser-side push subscription storage in Supabase.
// Server-side push SENDING is in app/actions/push.ts (Server Action) — not here.

import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushSubscriptionRecord {
  id: string
  family_id: string
  member_id: string
  subscription: Record<string, unknown>  // full PushSubscription JSON
  user_agent: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Save a browser PushSubscription to DB. Upserts by (member_id, endpoint). */
export async function savePushSubscription(
  familyId: string,
  memberId: string,
  subscription: PushSubscription
): Promise<void> {
  const supabase = createClient()
  const subJson = JSON.parse(JSON.stringify(subscription))
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        family_id: familyId,
        member_id: memberId,
        subscription: subJson,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'member_id,subscription->>endpoint' }
    )
  if (error) throw new Error(`savePushSubscription: ${error.message}`)
}

/** Delete the push subscription for a given endpoint (on unsubscribe). */
export async function deletePushSubscription(
  memberId: string,
  endpoint: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('member_id', memberId)
    .filter('subscription->>endpoint', 'eq', endpoint)
  if (error) throw new Error(`deletePushSubscription: ${error.message}`)
}

/** Get all push subscriptions for a family member (can have multiple devices). */
export async function getPushSubscriptions(memberId: string): Promise<PushSubscriptionRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('member_id', memberId)
  if (error) throw new Error(`getPushSubscriptions: ${error.message}`)
  return data ?? []
}
