// lib/repositories/wallet.repo.ts
// Supabase queries for wallet, rewards, exchanges, withdrawals, transactions.
// Sourced from lib/wallet-api.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import type {
  Wallet,
  Reward,
  RewardPurchase,
  CoinExchange,
  CashWithdrawal,
  WalletTransaction,
  WalletSettings,
  MonthlyPotential,
  AuditLog,
} from '../models/wallet.types'

// ============================================================================
// WALLET
// ============================================================================

export async function getWallet(childId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallet')
    .select('*')
    .eq('child_id', childId)
    .single()

  if (error) {
    console.error('Error fetching wallet:', error)
    return null
  }

  return data
}

export async function updateWalletCoins(
  childId: string,
  coinsChange: number,
  description: string,
  icon: string = '💰'
): Promise<Wallet | null> {
  const wallet = await getWallet(childId)
  if (!wallet) throw new Error('Wallet not found')

  const newCoins = wallet.coins + coinsChange
  if (newCoins < 0) throw new Error('Insufficient coins')

  const updates: any = { coins: newCoins }

  if (coinsChange > 0) {
    updates.total_earned_coins = wallet.total_earned_coins + coinsChange
  } else {
    updates.total_spent_coins = wallet.total_spent_coins + Math.abs(coinsChange)
  }

  const { data, error } = await supabase
    .from('wallet')
    .update(updates)
    .eq('child_id', childId)
    .select()
    .single()

  if (error) throw error

  await createTransaction(childId, {
    transaction_type: coinsChange > 0 ? 'earn_coins' : 'spend_coins',
    coins_change: coinsChange,
    money_change: 0,
    description,
    icon,
    balance_after_coins: newCoins,
    balance_after_money: wallet.money
  })

  return data
}

export async function updateWalletMoney(
  childId: string,
  moneyChange: number,
  description: string,
  icon: string = '💵'
): Promise<Wallet | null> {
  const wallet = await getWallet(childId)
  if (!wallet) throw new Error('Wallet not found')

  const newMoney = Number(wallet.money) + moneyChange
  if (newMoney < 0) throw new Error('Insufficient money')

  const updates: any = { money: newMoney }

  if (moneyChange > 0) {
    updates.total_earned_money = Number(wallet.total_earned_money) + moneyChange
  } else {
    updates.total_spent_money = Number(wallet.total_spent_money) + Math.abs(moneyChange)
  }

  const { data, error } = await supabase
    .from('wallet')
    .update(updates)
    .eq('child_id', childId)
    .select()
    .single()

  if (error) throw error

  await createTransaction(childId, {
    transaction_type: moneyChange > 0 ? 'earn_money' : 'spend_money',
    coins_change: 0,
    money_change: moneyChange,
    description,
    icon,
    balance_after_coins: wallet.coins,
    balance_after_money: newMoney
  })

  return data
}

// ============================================================================
// WALLET SETTINGS
// ============================================================================

export async function getWalletSettings(): Promise<WalletSettings> {
  const { data, error } = await supabase
    .from('wallet_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  if (error || !data) {
    return {
      id: 'default',
      base_exchange_rate: 10,
      bonus_100_coins: 10,
      bonus_500_coins: 20,
      bonus_1000_coins: 50,
      coins_per_grade_5: 10,
      coins_per_grade_4: 5,
      coins_per_grade_3: 2,
      coins_per_room_task: 3,
      coins_per_good_behavior: 5,
      coins_per_exercise: 5,
      coins_per_coach_5: 10,
      coins_per_coach_4: 5,
      coins_per_coach_3: 0,
      coins_per_coach_2: 3,
      coins_per_coach_1: 10,
      p2p_max_per_transfer: 100,
      p2p_max_per_day: 200,
      p2p_max_per_month: 500,
      p2p_max_debt: 200,
      updated_at: new Date().toISOString()
    }
  }

  return data
}

export async function updateWalletSettings(
  updates: Partial<Omit<WalletSettings, 'id' | 'updated_at'>>
): Promise<WalletSettings> {
  const { data, error } = await supabase
    .from('wallet_settings')
    .upsert({ id: 'default', ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function calculateExchangeRate(coins: number): Promise<{ rate: number, bonus: number }> {
  const settings = await getWalletSettings()
  let bonus = 0

  if (coins >= 1000) {
    bonus = settings.bonus_1000_coins
  } else if (coins >= 500) {
    bonus = settings.bonus_500_coins
  } else if (coins >= 100) {
    bonus = settings.bonus_100_coins
  }

  const rate = settings.base_exchange_rate * (1 + bonus / 100)

  return { rate, bonus }
}

// ============================================================================
// REWARDS
// ============================================================================

export async function getRewards(filters?: {
  childId?: string
  rewardType?: 'coins' | 'money'
  category?: string
  activeOnly?: boolean
}): Promise<Reward[]> {
  let query = supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  if (filters?.rewardType) {
    query = query.eq('reward_type', filters.rewardType)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching rewards:', error)
    return []
  }

  if (filters?.childId) {
    return data.filter(r => !r.for_child || r.for_child === filters.childId)
  }

  return data
}

// NOTE: auto_approve field requires DB migration:
// ALTER TABLE rewards ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;
// Run in Supabase SQL Editor before auto-approve takes effect.
// The field is passed through here; the column must exist in Supabase to persist.
export async function addReward(reward: Partial<Reward> & { auto_approve?: boolean }): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert([reward])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateReward(rewardId: string, updates: Partial<Reward> & { auto_approve?: boolean }): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', rewardId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId)

  if (error) throw error
}

// ============================================================================
// REWARD PURCHASES
// ============================================================================

export async function purchaseReward(
  childId: string,
  rewardId: string
): Promise<RewardPurchase> {
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single()

  if (rewardError || !reward) throw new Error('Reward not found')

  const wallet = await getWallet(childId)
  if (!wallet) throw new Error('Wallet not found')

  if (reward.reward_type === 'coins') {
    if (wallet.coins < (reward.price_coins || 0)) throw new Error('Insufficient coins')
  } else {
    if (Number(wallet.money) < Number(reward.price_money || 0)) throw new Error('Insufficient money')
  }

  let newCoins = wallet.coins
  let newMoney = Number(wallet.money)

  if (reward.reward_type === 'coins') {
    newCoins -= reward.price_coins || 0
    await supabase
      .from('wallet')
      .update({ coins: newCoins, total_spent_coins: wallet.total_spent_coins + (reward.price_coins || 0) })
      .eq('child_id', childId)
  } else {
    newMoney -= Number(reward.price_money || 0)
    await supabase
      .from('wallet')
      .update({ money: newMoney, total_spent_money: Number(wallet.total_spent_money) + Number(reward.price_money || 0) })
      .eq('child_id', childId)
  }

  const purchase = {
    reward_id: rewardId,
    child_id: childId,
    reward_title: reward.title,
    reward_icon: reward.icon,
    reward_type: reward.reward_type,
    price_coins: reward.price_coins,
    price_money: reward.price_money,
    balance_after_coins: newCoins,
    balance_after_money: newMoney
  }

  const { data, error } = await supabase
    .from('reward_purchases')
    .insert([purchase])
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('rewards')
    .update({ purchase_count: reward.purchase_count + 1 })
    .eq('id', rewardId)

  await createTransaction(childId, {
    transaction_type: reward.reward_type === 'coins' ? 'spend_coins' : 'spend_money',
    coins_change: reward.reward_type === 'coins' ? -(reward.price_coins || 0) : 0,
    money_change: reward.reward_type === 'money' ? -Number(reward.price_money || 0) : 0,
    description: `Куплено: ${reward.title}`,
    icon: reward.icon,
    related_id: data.id,
    related_type: 'reward',
    balance_after_coins: newCoins,
    balance_after_money: newMoney
  })

  return data
}

export async function getPurchases(childId?: string): Promise<RewardPurchase[]> {
  let query = supabase
    .from('reward_purchases')
    .select('*')
    .order('purchased_at', { ascending: false })

  if (childId) {
    query = query.eq('child_id', childId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching purchases:', error)
    return []
  }

  return data
}

export async function fulfillPurchase(
  purchaseId: string,
  note?: string
): Promise<RewardPurchase> {
  const { data, error } = await supabase
    .from('reward_purchases')
    .update({
      fulfilled: true,
      fulfilled_at: new Date().toISOString(),
      fulfilled_note: note,
      processed_by: 'parent'
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// COIN EXCHANGES
// ============================================================================

export async function exchangeCoins(
  childId: string,
  coinsAmount: number
): Promise<CoinExchange> {
  const wallet = await getWallet(childId)
  if (!wallet) throw new Error('Wallet not found')

  if (wallet.coins < coinsAmount) throw new Error('Insufficient coins')

  const { rate, bonus } = await calculateExchangeRate(wallet.coins)
  const moneyAmount = coinsAmount * rate

  const newCoins = wallet.coins - coinsAmount
  const newMoney = Number(wallet.money) + moneyAmount

  await supabase
    .from('wallet')
    .update({
      coins: newCoins,
      money: newMoney,
      total_exchanged_coins: wallet.total_exchanged_coins + coinsAmount,
      total_earned_money: Number(wallet.total_earned_money) + moneyAmount
    })
    .eq('child_id', childId)

  const exchange = {
    child_id: childId,
    coins_amount: coinsAmount,
    money_amount: moneyAmount,
    exchange_rate: rate,
    bonus_rate: bonus,
    balance_after_coins: newCoins,
    balance_after_money: newMoney
  }

  const { data, error } = await supabase
    .from('coin_exchanges')
    .insert([exchange])
    .select()
    .single()

  if (error) throw error

  await createTransaction(childId, {
    transaction_type: 'exchange',
    coins_change: -coinsAmount,
    money_change: moneyAmount,
    description: `Обменяно: ${coinsAmount} монет → ${moneyAmount.toFixed(0)}₽`,
    icon: '💱',
    related_id: data.id,
    related_type: 'exchange',
    balance_after_coins: newCoins,
    balance_after_money: newMoney
  })

  return data
}

export async function getExchanges(childId?: string): Promise<CoinExchange[]> {
  let query = supabase
    .from('coin_exchanges')
    .select('*')
    .order('exchanged_at', { ascending: false })

  if (childId) {
    query = query.eq('child_id', childId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching exchanges:', error)
    return []
  }

  return data
}

// ============================================================================
// CASH WITHDRAWALS
// ============================================================================

export async function requestWithdrawal(
  childId: string,
  amount: number
): Promise<CashWithdrawal> {
  const wallet = await getWallet(childId)
  if (!wallet) throw new Error('Wallet not found')

  if (Number(wallet.money) < amount) throw new Error('Insufficient money')

  const withdrawal = {
    child_id: childId,
    amount,
    balance_after_money: Number(wallet.money) - amount
  }

  const { data, error } = await supabase
    .from('cash_withdrawals')
    .insert([withdrawal])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function approveWithdrawal(
  withdrawalId: string,
  note?: string
): Promise<CashWithdrawal> {
  const { data: withdrawal, error: fetchError } = await supabase
    .from('cash_withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single()

  if (fetchError || !withdrawal) throw new Error('Withdrawal not found')

  const wallet = await getWallet(withdrawal.child_id)
  if (!wallet) throw new Error('Wallet not found')

  const newMoney = Number(wallet.money) - withdrawal.amount
  if (newMoney < 0) throw new Error('Insufficient money')

  await supabase
    .from('wallet')
    .update({ money: newMoney, total_spent_money: Number(wallet.total_spent_money) + withdrawal.amount })
    .eq('child_id', withdrawal.child_id)

  const { data, error } = await supabase
    .from('cash_withdrawals')
    .update({
      status: 'approved',
      processed_by: 'parent',
      processed_at: new Date().toISOString(),
      note,
      balance_after_money: newMoney
    })
    .eq('id', withdrawalId)
    .select()
    .single()

  if (error) throw error

  await createTransaction(withdrawal.child_id, {
    transaction_type: 'withdraw',
    coins_change: 0,
    money_change: -withdrawal.amount,
    description: `Выведено наличными: ${withdrawal.amount}₽`,
    icon: '💵',
    related_id: withdrawalId,
    related_type: 'withdrawal',
    balance_after_coins: wallet.coins,
    balance_after_money: newMoney
  })

  return data
}

export async function rejectWithdrawal(
  withdrawalId: string,
  note?: string
): Promise<CashWithdrawal> {
  const { data, error } = await supabase
    .from('cash_withdrawals')
    .update({
      status: 'rejected',
      processed_by: 'parent',
      processed_at: new Date().toISOString(),
      note
    })
    .eq('id', withdrawalId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getWithdrawals(childId?: string, status?: string): Promise<CashWithdrawal[]> {
  let query = supabase
    .from('cash_withdrawals')
    .select('*')
    .order('requested_at', { ascending: false })

  if (childId) query = query.eq('child_id', childId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching withdrawals:', error)
    return []
  }

  return data
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

async function createTransaction(
  childId: string,
  transaction: Partial<WalletTransaction>
): Promise<WalletTransaction> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .insert([{ child_id: childId, ...transaction }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTransactions(
  childId?: string,
  limit: number = 50
): Promise<WalletTransaction[]> {
  let query = supabase
    .from('wallet_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (childId) query = query.eq('child_id', childId)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data
}

// ============================================================================
// COIN AWARDS
// ============================================================================

export async function awardCoinsForGrade(
  childId: string,
  grade: number,
  subject: string = 'Урок'
): Promise<void> {
  const settings = await getWalletSettings()
  let coins = 0
  let icon = '📚'

  if (grade === 5) { coins = settings.coins_per_grade_5; icon = '🎉' }
  else if (grade === 4) { coins = settings.coins_per_grade_4; icon = '👍' }
  else if (grade === 3) { coins = -settings.coins_per_grade_3; icon = '⚠️' }
  else if (grade === 2) { coins = -5; icon = '❌' }
  else if (grade === 1) { coins = -10; icon = '💥' }
  // grades 2 and 1 keep hardcoded penalties — wallet_settings has no fields for them

  if (coins !== 0) {
    const description = coins > 0
      ? `${subject}: оценка ${grade} → +${coins}💰`
      : `${subject}: оценка ${grade} → ${coins}💰 (штраф)`

    await updateWalletCoins(childId, coins, description, icon)
  }
}

export async function awardCoinsForRoom(childId: string): Promise<void> {
  const settings = await getWalletSettings()
  await updateWalletCoins(childId, settings.coins_per_room_task, 'Убрана комната', '🏠')
}

export async function awardCoinsForBehavior(childId: string): Promise<void> {
  const settings = await getWalletSettings()
  await updateWalletCoins(childId, settings.coins_per_good_behavior, 'Хорошее поведение', '😊')
}

export async function awardCoinsForExercise(childId: string): Promise<void> {
  const settings = await getWalletSettings()
  await updateWalletCoins(childId, settings.coins_per_exercise, 'Спорт', '💪')
}

export async function awardCoinsForSport(
  childId: string,
  coachRating: number,
  sportName: string = 'Тренировка',
  coachComment?: string
): Promise<void> {
  if (coachRating < 1 || coachRating > 5) return

  const settings = await getWalletSettings()
  let coins = 0
  if (coachRating === 5) coins = settings.coins_per_coach_5
  else if (coachRating === 4) coins = settings.coins_per_coach_4
  else if (coachRating === 3) coins = settings.coins_per_coach_3
  else if (coachRating === 2) coins = -settings.coins_per_coach_2
  else if (coachRating === 1) coins = -settings.coins_per_coach_1

  let icon = '💪'
  if (coachRating === 5) icon = '🔥'
  else if (coachRating <= 2) icon = '⚠️'

  let description = `${sportName}: оценка тренера ${coachRating}`
  if (coachComment) description += ` ("${coachComment}")`
  if (coins > 0) description += ` → +${coins}💰`
  else if (coins < 0) description += ` → ${coins}💰 (штраф)`
  else description += ` → 0💰`

  if (coins !== 0) {
    await updateWalletCoins(childId, coins, description, icon)
  }
}

export async function logSettingsChange(childId: string, description: string): Promise<void> {
  const wallet = await getWallet(childId)
  await supabase.from('wallet_transactions').insert({
    child_id: childId,
    transaction_type: 'settings_change',
    coins_change: 0,
    money_change: 0,
    description,
    icon: '⚙️',
    related_id: null,
    related_type: null,
    balance_after_coins: wallet?.coins ?? 0,
    balance_after_money: wallet?.money ?? 0,
  })
}

// ============================================================================
// MONTHLY POTENTIAL
// ============================================================================

export async function getMonthlyPotential(childId: string): Promise<MonthlyPotential> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]
  const toDate = new Date().toISOString().split('T')[0]

  const [{ data: grades }, { data: days }] = await Promise.all([
    supabase.from('subject_grades').select('grade').eq('child_id', childId).gte('date', fromDate).lte('date', toDate),
    supabase.from('days').select('room_ok, good_behavior').eq('child_id', childId).gte('date', fromDate).lte('date', toDate)
  ])

  const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }
  const gradesPotential = (grades || []).reduce((sum, g) => sum + (GRADE_COINS[g.grade] ?? 0), 0)
  const roomPotential = (days || []).filter(d => d.room_ok).length * 3
  const behaviorPotential = (days || []).filter(d => d.good_behavior).length * 5

  const base = gradesPotential + roomPotential + behaviorPotential
  const sportPotential = Math.round(base * 0.15)

  return {
    child_id: childId,
    base_potential: base,
    max_with_bonuses: Math.round(base * 1.3),
    grades_potential: gradesPotential,
    room_potential: roomPotential,
    sport_potential: sportPotential,
    behavior_potential: behaviorPotential,
    available_bonuses: {
      perfect_week: { icon: '🔥', title: 'Идеальная неделя', amount: 50 },
      perfect_month: { icon: '🏆', title: 'Идеальный месяц', amount: 100 },
      streak_7: { icon: '⚡', title: 'Стрик 7 дней', amount: 20 },
      streak_30: { icon: '💪', title: 'Стрик 30 дней', amount: 50 },
      record: { icon: '🎯', title: 'Побил рекорд', amount: 25 },
      challenge: { icon: '🎁', title: 'Челлендж', amount: 40 }
    }
  }
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function getAuditLog(childId: string, limit: number = 50): Promise<AuditLog[]> {
  const transactions = await getTransactions(childId, limit)

  return transactions.map(t => ({
    id: t.id,
    child_id: t.child_id,
    action_type: t.transaction_type,
    action_by: 'system',
    coins_change: t.coins_change,
    money_change: t.money_change,
    description: t.description,
    icon: t.icon,
    coins_before: (t.balance_after_coins || 0) - (t.coins_change || 0),
    coins_after: t.balance_after_coins,
    money_before: (t.balance_after_money || 0) - (t.money_change || 0),
    money_after: t.balance_after_money,
    created_at: t.created_at,
    is_suspicious: false,
    requires_review: false,
    parent_reviewed: false,
    metadata: {},
    related_type: t.related_type
  }))
}

// ============================================================================
// P2P TRANSFERS
// ============================================================================

export async function createP2PTransfer(params: {
  from_child_id: string
  to_child_id: string
  amount: number
  transfer_type: 'gift' | 'payment' | 'loan' | 'deal'
  note?: string
  deal_description?: string | null
  loan_interest?: number
  loan_due_date?: string | null
}): Promise<any> {
  const fromWallet = await getWallet(params.from_child_id)
  if (!fromWallet || fromWallet.coins < params.amount) {
    throw new Error('Insufficient coins')
  }

  await updateWalletCoins(
    params.from_child_id,
    -params.amount,
    `Перевод → ${params.to_child_id}: ${params.amount}💰 (${params.transfer_type})`,
    '💸'
  )

  await updateWalletCoins(
    params.to_child_id,
    params.amount,
    `Перевод от ${params.from_child_id}: ${params.amount}💰 (${params.transfer_type})`,
    '💰'
  )

  return {
    id: Date.now().toString(),
    ...params,
    status: 'completed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString()
  }
}
