'use server'

import { createPurchaseRequest } from '@/lib/repositories/wallet.repo'
import { checkAndAwardBadges } from '@/lib/services/badges.service'
import { notifyParent } from '@/app/actions/push-notifications'
import { createClient } from '@/lib/supabase/server'
import type { RewardPurchase } from '@/lib/models/wallet.types'

export async function requestPurchase(
  childId: string,
  rewardId: string
): Promise<RewardPurchase> {
  const purchase = await createPurchaseRequest(childId, rewardId)

  // Check badges after purchase (first_purchase badge, coin_saver, etc.)
  try {
    const today = new Date().toISOString().slice(0, 10)
    await checkAndAwardBadges(childId, today)
  } catch (e) {
    console.warn('[requestPurchase] badge check failed:', e)
  }

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
          `New request ${purchase.reward_icon ?? '🎁'}`,
          `${purchase.reward_title} — awaiting approval`,
          '/parent-center'
        )
      }
    } catch (e) {
      console.warn('[requestPurchase] parent push failed:', e)
    }
  }

  return purchase
}
