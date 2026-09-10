'use server'

import { checkAndAwardBadges } from '@/lib/services/badges.service'
import { emitBadgeFeedEvents } from '@/app/actions/emit-badge-feed'
import { emitFeedEvent } from '@/lib/services/feed.service'
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
    const newBadges = await checkAndAwardBadges(childId, today)
    if (newBadges.length > 0) void emitBadgeFeedEvents(childId, newBadges)
  } catch (e) {
    console.warn('[requestPurchase] badge check failed:', e)
  }

  // Auto-approved purchases skip the parent shop action (and its
  // reward_approved feed event), so surface them here. Pending ones get their
  // feed row when a parent approves.
  if (purchase.status === 'approved') {
    void emitFeedEvent({
      familyId: member.familyId,
      childId,
      kind: 'purchase',
      title: `Покупка: ${purchase.reward_title}`,
      amount: purchase.price_coins ? -Math.abs(purchase.price_coins) : null,
      icon: purchase.reward_icon ?? '🛒',
      refType: 'reward_purchase',
      refId: purchase.id,
      mode: 'once',
    }, admin)
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
