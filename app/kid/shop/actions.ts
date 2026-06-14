'use server'

import { checkAndAwardBadges } from '@/lib/services/badges.service'
import { notifyParent } from '@/app/actions/push-notifications'
import { createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { authorizeChildAction, processPurchase } from '@/app/api/wallet/_lib'
import type { RewardPurchase } from '@/lib/models/wallet.types'
import { localDateString } from '@/utils/helpers'

export async function requestPurchase(
  childId: string,
  rewardId: string
): Promise<RewardPurchase> {
  const member = await requireFamilyMember()
  const admin = createAdminClient()
  await authorizeChildAction(admin, member, childId)
  const purchase = (await processPurchase(admin, member.familyId, childId, rewardId)) as unknown as RewardPurchase

  // Check badges after purchase (first_purchase badge, coin_saver, etc.)
  try {
    const today = localDateString()
    await checkAndAwardBadges(childId, today)
  } catch (e) {
    console.warn('[requestPurchase] badge check failed:', e)
  }

  // Only notify parents for pending purchases (auto-approved ones don't need it)
  if (purchase.status === 'pending') {
    try {
      await notifyParent(
        member.familyId,
        `New request ${purchase.reward_icon ?? '🎁'}`,
        `${purchase.reward_title} — awaiting approval`,
        '/parent-center'
      )
    } catch (e) {
      console.warn('[requestPurchase] parent push failed:', e)
    }
  }

  return purchase
}
