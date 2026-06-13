'use server'
// TODO: Phase 4.3+ — localize push notification strings based on family language preference stored in DB

import { createAdminClient, requireParent, assertChildInFamily, AuthError } from '@/lib/supabase/admin'
import { loadWallet, insertTx } from '@/app/api/wallet/_lib'
import { notifyChild } from '@/app/actions/push-notifications'

export interface SendMedalParams {
  childId: string       // children.id
  familyId: string      // ignored — the parent's own family is used (kept for call-site compat)
  message: string       // 1–200 chars
  coins: number         // 0–100, integer
  sentBy?: string       // parent display name for the record
}

export interface SendMedalResult {
  success: boolean
  error?: string
}

export async function sendMedal(params: SendMedalParams): Promise<SendMedalResult> {
  const { childId, message, coins, sentBy } = params

  // Validation
  if (!message.trim() || message.length > 200) {
    return { success: false, error: 'Сообщение должно быть от 1 до 200 символов' }
  }
  if (coins < 0 || coins > 100 || !Number.isInteger(coins)) {
    return { success: false, error: 'Монеты: от 0 до 100' }
  }

  // Only a parent may send a medal, and only to a child in their own family.
  // The client-supplied familyId is NOT trusted.
  let familyId: string
  const admin = createAdminClient()
  try {
    const member = await requireParent()
    familyId = member.familyId
    await assertChildInFamily(admin, childId, familyId)
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message }
    throw e
  }

  const today = new Date().toISOString().split('T')[0]

  // Check: only one medal per child per day
  const { data: existing } = await admin
    .from('medals')
    .select('id')
    .eq('child_id', childId)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Медаль уже отправлена сегодня' }
  }

  // Insert medal record
  const { error: insertError } = await admin
    .from('medals')
    .insert({ family_id: familyId, child_id: childId, date: today, message, coins, sent_by: sentBy ?? null })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Credit coins (if > 0)
  if (coins > 0) {
    try {
      const wallet = await loadWallet(admin, childId)
      const newCoins = wallet.coins + coins
      await admin
        .from('wallet')
        .update({ coins: newCoins, total_earned_coins: wallet.total_earned_coins + coins })
        .eq('child_id', childId)
      await insertTx(admin, childId, {
        family_id: wallet.family_id,
        transaction_type: 'earn_coins',
        coins_change: coins,
        money_change: 0,
        description: `Медаль дня: ${message.slice(0, 40)}`,
        icon: '🏅',
        balance_after_coins: newCoins,
        balance_after_money: Number(wallet.money),
      })
    } catch (e) {
      console.warn('[sendMedal] coin credit failed:', e)
      // Medal was saved; coin failure is non-fatal
    }
  }

  // Send push notification
  try {
    const coinText = coins > 0 ? ` (+${coins} монет)` : ''
    await notifyChild(
      childId,
      '🏅 Медаль дня!',
      `${message}${coinText}`,
      '/kid/day'
    )
  } catch (e) {
    console.warn('[sendMedal] push failed:', e)
  }

  return { success: true }
}
