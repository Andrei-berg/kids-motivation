'use server'

import { createClient } from '@/lib/supabase/server'
import { updateWalletCoins } from '@/lib/repositories/wallet.repo'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import type { RewardPurchase } from '@/lib/models/wallet.types'

export async function approvePurchaseAction(purchaseId: string): Promise<RewardPurchase> {
  const supabase = await createClient()

  const { data: purchase, error: fetchError } = await supabase
    .from('reward_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single()

  if (fetchError || !purchase) throw new Error('Purchase not found')
  if (purchase.status !== 'pending') throw new Error('Purchase is not pending')

  // frozen_coins > 0 = legacy freeze flow (deduct now); 0 = already deducted at request time
  if (purchase.reward_type === 'coins' && purchase.frozen_coins > 0) {
    await updateWalletCoins(
      purchase.child_id,
      -purchase.frozen_coins,
      `Покупка одобрена: ${purchase.reward_title}`,
      purchase.reward_icon
    )
  }

  const { data, error } = await supabase
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
    actor_user_id: null,
    metadata: { purchase_id: purchaseId },
  })

  return data
}

export async function rejectPurchaseAction(
  purchaseId: string,
  rejectionNote?: string
): Promise<RewardPurchase> {
  const supabase = await createClient()

  const { data: purchase, error: fetchError } = await supabase
    .from('reward_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single()

  if (fetchError || !purchase) throw new Error('Purchase not found')
  if (purchase.status !== 'pending') throw new Error('Purchase is not pending')

  // Coins are deducted at request time (frozen_coins=0) — refund them on reject
  const priceCoins = purchase.price_coins ?? 0
  if (purchase.reward_type === 'coins' && purchase.frozen_coins === 0 && priceCoins > 0) {
    await updateWalletCoins(
      purchase.child_id,
      priceCoins,
      `Возврат: запрос отклонён — ${purchase.reward_title}`,
      '↩️'
    )
  }

  const { data, error } = await supabase
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
    actor_user_id: null,
    metadata: { purchase_id: purchaseId, refunded_coins: priceCoins },
  })

  return data
}
