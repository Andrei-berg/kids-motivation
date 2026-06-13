// app/api/wallet/_lib.ts
// Shared helpers for server-side wallet routes. Server-only.

import { NextResponse } from 'next/server'
import { AuthError, assertChildInFamily, type Membership } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

/**
 * Authorize an action targeting a specific child's wallet:
 *  - a child member may only act on their own linked child;
 *  - any family member's target child must belong to their family.
 * Throws AuthError(403) otherwise.
 */
export async function authorizeChildAction(
  admin: Admin,
  member: Membership,
  childId: string,
): Promise<void> {
  if (member.role === 'child' && member.childId !== childId) {
    throw new AuthError('Forbidden', 403)
  }
  await assertChildInFamily(admin, childId, member.familyId)
}

/** Map a thrown error to a JSON response. AuthError carries its own status. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  const message = err instanceof Error ? err.message : 'Internal error'
  return NextResponse.json({ error: message }, { status: 500 })
}

// Defaults mirror lib/repositories/wallet.repo.ts getWalletSettings() fallback.
const SETTINGS_DEFAULTS = {
  base_exchange_rate: 10,
  bonus_100_coins: 10,
  bonus_500_coins: 20,
  bonus_1000_coins: 50,
  coins_per_grade_5: 10,
  coins_per_grade_4: 5,
  coins_per_grade_3: -3,
  coins_per_grade_2: -5,
  coins_per_grade_1: -10,
  coins_per_room_task: 3,
  coins_per_good_behavior: 5,
  coins_per_exercise: 5,
  coins_per_coach_5: 10,
  coins_per_coach_4: 5,
  coins_per_coach_3: 0,
  coins_per_coach_2: -3,
  coins_per_coach_1: -10,
  coins_per_book: 20,
  p2p_max_per_transfer: 100,
  p2p_max_per_day: 200,
  p2p_max_per_month: 500,
  p2p_max_debt: 200,
} as Record<string, number>

export type WalletSettingsRow = Record<string, number> & { id: string; family_id: string }

/** Load a family's wallet settings via the service client, falling back to defaults. */
export async function loadSettings(admin: Admin, familyId: string): Promise<WalletSettingsRow> {
  const { data } = await admin
    .from('wallet_settings')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle()
  return { id: 'default', family_id: familyId, ...SETTINGS_DEFAULTS, ...(data ?? {}) }
}

export type WalletRow = {
  child_id: string
  coins: number
  money: number
  total_earned_coins: number
  total_spent_coins: number
  total_exchanged_coins: number
  total_earned_money: number
  total_spent_money: number
  family_id: string | null
}

/** Load a child's wallet row via the service client. Throws if missing. */
export async function loadWallet(admin: Admin, childId: string): Promise<WalletRow> {
  const { data, error } = await admin
    .from('wallet')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle()
  if (error || !data) throw new Error('Wallet not found')
  return data as WalletRow
}

/** Insert a wallet_transactions row via the service client. */
export async function insertTx(
  admin: Admin,
  childId: string,
  tx: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.from('wallet_transactions').insert([{ child_id: childId, ...tx }])
  if (error) throw error
}

/**
 * Server-side reward purchase: validates the reward + balance, deducts coins
 * immediately, and creates the reward_purchases row (auto_approve → 'approved',
 * else 'pending'). Shared by /api/wallet/purchase and the kid requestPurchase
 * server action. Caller must have already authorized childId.
 * Returns the created purchase row.
 */
export async function processPurchase(
  admin: Admin,
  familyId: string,
  childId: string,
  rewardId: string,
): Promise<Record<string, unknown>> {
  const { data: reward, error: rewardErr } = await admin
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('family_id', familyId)
    .maybeSingle()
  if (rewardErr || !reward) throw new AuthError('Reward not found', 404)
  if (!reward.is_active) throw new AuthError('Reward is not active', 400)

  const wallet = await loadWallet(admin, childId)
  const isCoins = reward.reward_type === 'coins'
  const priceCoins = isCoins ? reward.price_coins || 0 : 0
  if (isCoins && wallet.coins < priceCoins) throw new AuthError('Insufficient coins', 400)

  const autoApprove = reward.auto_approve === true
  const newCoins = wallet.coins - priceCoins

  if (priceCoins > 0) {
    const { error } = await admin
      .from('wallet')
      .update({ coins: newCoins, total_spent_coins: wallet.total_spent_coins + priceCoins })
      .eq('child_id', childId)
    if (error) throw error
  }

  const { data: created, error: insErr } = await admin
    .from('reward_purchases')
    .insert([{
      reward_id: rewardId,
      child_id: childId,
      reward_title: reward.title,
      reward_icon: reward.icon,
      reward_type: reward.reward_type,
      price_coins: reward.price_coins,
      price_money: reward.price_money,
      status: autoApprove ? 'approved' : 'pending',
      frozen_coins: 0,
      fulfilled: false,
      ...(autoApprove ? { processed_by: 'auto', processed_at: new Date().toISOString() } : {}),
      balance_after_coins: newCoins,
      balance_after_money: Number(wallet.money),
      family_id: familyId,
    }])
    .select()
    .single()
  if (insErr) throw insErr

  await admin
    .from('rewards')
    .update({ purchase_count: (reward.purchase_count ?? 0) + 1 })
    .eq('id', rewardId)

  if (priceCoins > 0) {
    await insertTx(admin, childId, {
      family_id: familyId,
      transaction_type: 'spend_coins',
      coins_change: -priceCoins,
      money_change: 0,
      description: `Куплено: ${reward.title}`,
      icon: reward.icon,
      related_id: created.id,
      related_type: 'reward',
      balance_after_coins: newCoins,
      balance_after_money: Number(wallet.money),
    })
  }

  return created
}

export type AwardIntent = {
  coins: number
  description: string
  icon: string
  sourceType: string
  sourceId: string
}

/**
 * Idempotently credit a batch of award intents to a child's wallet using the
 * service client. An intent is skipped if a wallet_transactions row with the
 * same (child_id, source_type, source_id) already exists — so re-running the
 * reconcile for a day never double-awards. The unique index added in
 * 04.4-02-wallet-tx-idempotency.sql is a race backstop; this explicit pre-check
 * also makes the route correct before that index is applied.
 *
 * Balances are updated once at the end. Returns the net coins newly credited.
 */
export async function creditAwards(
  admin: Admin,
  childId: string,
  intents: AwardIntent[],
): Promise<{ creditedCoins: number; applied: AwardIntent[] }> {
  if (intents.length === 0) return { creditedCoins: 0, applied: [] }

  const { data: wallet, error: walletErr } = await admin
    .from('wallet')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle()
  if (walletErr || !wallet) throw new Error('Wallet not found')
  const w = wallet as WalletRow

  let runningCoins = w.coins
  let totalEarned = w.total_earned_coins
  let totalSpent = w.total_spent_coins
  let net = 0
  const applied: AwardIntent[] = []

  for (const intent of intents) {
    if (intent.coins === 0) continue

    // Skip if this source was already awarded.
    const { data: existing } = await admin
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', childId)
      .eq('source_type', intent.sourceType)
      .eq('source_id', intent.sourceId)
      .maybeSingle()
    if (existing) continue

    runningCoins += intent.coins
    if (intent.coins > 0) totalEarned += intent.coins
    else totalSpent += Math.abs(intent.coins)
    net += intent.coins

    const { error: insErr } = await admin.from('wallet_transactions').insert({
      child_id: childId,
      family_id: w.family_id,
      transaction_type: intent.coins > 0 ? 'earn_coins' : 'spend_coins',
      coins_change: intent.coins,
      money_change: 0,
      description: intent.description,
      icon: intent.icon,
      balance_after_coins: runningCoins,
      balance_after_money: w.money,
      source_type: intent.sourceType,
      source_id: intent.sourceId,
    })
    // Unique-index violation (race): another request awarded it first. Roll back
    // this intent's contribution and continue.
    if (insErr) {
      if (insErr.code === '23505') {
        runningCoins -= intent.coins
        if (intent.coins > 0) totalEarned -= intent.coins
        else totalSpent -= Math.abs(intent.coins)
        net -= intent.coins
        continue
      }
      throw insErr
    }
    applied.push(intent)
  }

  if (net !== 0) {
    const { error: updErr } = await admin
      .from('wallet')
      .update({
        coins: runningCoins,
        total_earned_coins: totalEarned,
        total_spent_coins: totalSpent,
      })
      .eq('child_id', childId)
    if (updErr) throw updErr
  }

  return { creditedCoins: net, applied }
}
