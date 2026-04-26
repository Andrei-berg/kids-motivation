'use server'

import { createPurchaseRequest } from '@/lib/repositories/wallet.repo'
import { notifyParent } from '@/app/actions/push-notifications'
import { createClient } from '@/lib/supabase/server'
import type { RewardPurchase } from '@/lib/models/wallet.types'

/**
 * Server action: create a shop purchase request and notify parents.
 * Wraps createPurchaseRequest so that notifyParent (a server action)
 * runs server-side — dynamic-importing it from a client component would
 * not run it server-side.
 *
 * Push failure is non-blocking: caught in try/catch so it never breaks
 * the purchase flow.
 */
export async function requestPurchase(
  childId: string,
  rewardId: string
): Promise<RewardPurchase> {
  // Create the purchase request (runs entirely server-side here)
  const purchase = await createPurchaseRequest(childId, rewardId)

  // Only notify parents for pending purchases (auto-approved ones don't need it)
  if (purchase.status === 'pending') {
    try {
      const supabase = await createClient()
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('child_id', childId)
        .maybeSingle()

      if (member?.family_id) {
        await notifyParent(
          member.family_id,
          `Новый запрос ${purchase.reward_icon ?? '🎁'}`,
          `${purchase.reward_title} — ждёт одобрения`,
          '/parent-center'
        )
      }
    } catch (e) {
      // Non-blocking: push failure must never break the purchase flow
      console.warn('[requestPurchase] parent push failed:', e)
    }
  }

  return purchase
}
