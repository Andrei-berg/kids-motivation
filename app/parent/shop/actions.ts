'use server'

import { createAdminClient, requireParent } from '@/lib/supabase/admin'
import { loadWallet, insertTx } from '@/app/api/wallet/_lib'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import type { RewardPurchase } from '@/lib/models/wallet.types'

// Adjust a child's coin balance via the service-role client (bypasses RLS) and
// record the matching wallet transaction. Used for approve-time legacy deduct
// and reject-time refunds. Mirrors the relevant parts of updateWalletCoins.
async function adjustCoins(
  admin: ReturnType<typeof createAdminClient>,
  childId: string,
  delta: number,
  description: string,
  icon: string,
  relatedId: string,
) {
  const wallet = await loadWallet(admin, childId)
  const newCoins = wallet.coins + delta
  if (newCoins < 0) throw new Error('Insufficient coins')
  const updates: Record<string, number> =
    delta > 0
      ? { coins: newCoins, total_earned_coins: wallet.total_earned_coins + delta }
      : { coins: newCoins, total_spent_coins: wallet.total_spent_coins + Math.abs(delta) }
  const { error } = await admin.from('wallet').update(updates).eq('child_id', childId)
  if (error) throw error
  await insertTx(admin, childId, {
    family_id: wallet.family_id,
    transaction_type: delta > 0 ? 'earn_coins' : 'spend_coins',
    coins_change: delta,
    money_change: 0,
    description,
    icon,
    related_id: relatedId,
    related_type: 'reward',
    balance_after_coins: newCoins,
    balance_after_money: Number(wallet.money),
  })
}

export async function approvePurchaseAction(purchaseId: string): Promise<RewardPurchase> {
  const member = await requireParent()
  const admin = createAdminClient()

  const { data: purchase, error: fetchError } = await admin
    .from('reward_purchases')
    .select('*')
    .eq('id', purchaseId)
    .eq('family_id', member.familyId)
    .maybeSingle()

  if (fetchError || !purchase) throw new Error('Purchase not found')
  if (purchase.status !== 'pending') throw new Error('Purchase is not pending')

  // frozen_coins > 0 = legacy freeze flow (deduct now); 0 = already deducted at request time
  if (purchase.reward_type === 'coins' && purchase.frozen_coins > 0) {
    await adjustCoins(
      admin,
      purchase.child_id,
      -purchase.frozen_coins,
      `Покупка одобрена: ${purchase.reward_title}`,
      purchase.reward_icon,
      purchaseId,
    )
  }

  const { data, error } = await admin
    .from('reward_purchases')
    .update({
      status: 'approved',
      processed_by: 'parent',
      processed_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) throw error

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      purchase.child_id,
      `Покупка одобрена! ${purchase.reward_icon ?? '🎁'}`,
      `${purchase.reward_title} — заслужил!`,
      '/kid/wallet'
    )
  } catch (e) {
    console.warn('[approvePurchaseAction] push failed:', e)
  }

  void insertAuditEvent({
    family_id: purchase.family_id ?? '',
    child_id: purchase.child_id ?? null,
    action_type: 'shop_approve',
    description: `Approved shop purchase: ${purchase.reward_title} (${purchase.price_coins}💰)`,
    coins_delta: null,
    actor_user_id: member.userId,
    metadata: { purchase_id: purchaseId },
  })

  return data
}

export async function rejectPurchaseAction(
  purchaseId: string,
  rejectionNote?: string
): Promise<RewardPurchase> {
  const member = await requireParent()
  const admin = createAdminClient()

  const { data: purchase, error: fetchError } = await admin
    .from('reward_purchases')
    .select('*')
    .eq('id', purchaseId)
    .eq('family_id', member.familyId)
    .maybeSingle()

  if (fetchError || !purchase) throw new Error('Purchase not found')
  if (purchase.status !== 'pending') throw new Error('Purchase is not pending')

  // Coins are deducted at request time (frozen_coins=0) — refund them on reject
  const priceCoins = purchase.price_coins ?? 0
  if (purchase.reward_type === 'coins' && purchase.frozen_coins === 0 && priceCoins > 0) {
    await adjustCoins(
      admin,
      purchase.child_id,
      priceCoins,
      `Возврат: запрос отклонён — ${purchase.reward_title}`,
      '↩️',
      purchaseId,
    )
  }

  const { data, error } = await admin
    .from('reward_purchases')
    .update({
      status: 'rejected',
      rejection_note: rejectionNote || null,
      processed_by: 'parent',
      processed_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) throw error

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      purchase.child_id,
      `Запрос отклонён ${purchase.reward_icon ?? '🎁'}`,
      `${purchase.reward_title} — монеты возвращены`,
      '/kid/shop'
    )
  } catch (e) {
    console.warn('[rejectPurchaseAction] push failed:', e)
  }

  void insertAuditEvent({
    family_id: purchase.family_id ?? '',
    child_id: purchase.child_id ?? null,
    action_type: 'shop_reject',
    description: `Rejected shop purchase: ${purchase.reward_title} — coins refunded`,
    coins_delta: priceCoins > 0 ? priceCoins : null,
    actor_user_id: member.userId,
    metadata: { purchase_id: purchaseId, refunded_coins: priceCoins },
  })

  return data
}
