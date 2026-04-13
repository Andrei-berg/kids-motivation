'use server'

import { createClient } from '@/lib/supabase/server'
import { updateWalletCoins } from '@/lib/repositories/wallet.repo'
import { notifyChild } from '@/app/actions/push-notifications'

export interface SendMedalParams {
  childId: string       // children.id
  familyId: string
  message: string       // 1–200 chars
  coins: number         // 0–100, integer
  sentBy?: string       // parent display name for the record
}

export interface SendMedalResult {
  success: boolean
  error?: string
}

export async function sendMedal(params: SendMedalParams): Promise<SendMedalResult> {
  const { childId, familyId, message, coins, sentBy } = params

  // Validation
  if (!message.trim() || message.length > 200) {
    return { success: false, error: 'Сообщение должно быть от 1 до 200 символов' }
  }
  if (coins < 0 || coins > 100 || !Number.isInteger(coins)) {
    return { success: false, error: 'Монеты: от 0 до 100' }
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Check: only one medal per child per day
  const { data: existing } = await supabase
    .from('medals')
    .select('id')
    .eq('child_id', childId)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Медаль уже отправлена сегодня' }
  }

  // Insert medal record
  const { error: insertError } = await supabase
    .from('medals')
    .insert({ family_id: familyId, child_id: childId, date: today, message, coins, sent_by: sentBy ?? null })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Credit coins (if > 0)
  if (coins > 0) {
    try {
      await updateWalletCoins(childId, coins, `Медаль дня: ${message.slice(0, 40)}`, '🏅')
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
