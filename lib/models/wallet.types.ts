// Types extracted from lib/wallet-api.ts

export interface Wallet {
  child_id: string
  coins: number
  money: number
  total_earned_coins: number
  total_spent_coins: number
  total_exchanged_coins: number
  total_earned_money: number
  total_spent_money: number
  updated_at: string
  family_id?: string | null
}

export interface Reward {
  id: string
  title: string
  description: string | null
  icon: string
  reward_type: 'coins' | 'money'
  price_coins: number | null
  price_money: number | null
  is_active: boolean
  for_child: string | null
  category: string
  created_by: string
  created_at: string
  purchase_count: number
}

export interface RewardPurchase {
  id: string
  reward_id: string
  child_id: string
  reward_title: string
  reward_icon: string
  reward_type: 'coins' | 'money'
  price_coins: number | null
  price_money: number | null
  purchased_at: string
  fulfilled: boolean
  fulfilled_at: string | null
  fulfilled_note: string | null
  balance_after_coins: number
  balance_after_money: number
  // Phase 2.4: approval lifecycle fields
  status: 'pending' | 'approved' | 'rejected' | 'delivered'
  frozen_coins: number
  processed_by: string | null
  processed_at: string | null
  rejection_note: string | null
}

export interface CoinExchange {
  id: string
  child_id: string
  coins_amount: number
  money_amount: number
  exchange_rate: number
  bonus_rate: number
  balance_after_coins: number
  balance_after_money: number
  exchanged_at: string
}

export interface CashWithdrawal {
  id: string
  child_id: string
  amount: number
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  processed_by: string | null
  processed_at: string | null
  note: string | null
  balance_after_money: number
}

export interface WalletTransaction {
  id: string
  child_id: string
  transaction_type: string
  coins_change: number
  money_change: number
  description: string
  icon: string
  related_id: string | null
  related_type: string | null
  balance_after_coins: number
  balance_after_money: number
  created_at: string
  family_id?: string | null
}

export interface WalletSettings {
  id: string
  base_exchange_rate: number
  bonus_100_coins: number
  bonus_500_coins: number
  bonus_1000_coins: number
  coins_per_grade_5: number
  coins_per_grade_4: number
  coins_per_grade_3: number
  coins_per_grade_2: number
  coins_per_grade_1: number
  coins_per_room_task: number
  coins_per_good_behavior: number
  coins_per_exercise: number
  coins_per_coach_5: number
  coins_per_coach_4: number
  coins_per_coach_3: number
  coins_per_coach_2: number
  coins_per_coach_1: number
  p2p_max_per_transfer: number
  p2p_max_per_day: number
  p2p_max_per_month: number
  p2p_max_debt: number
  updated_at: string
}

export interface MonthlyPotential {
  child_id: string
  base_potential: number
  max_with_bonuses: number
  grades_potential?: number
  room_potential?: number
  sport_potential?: number
  behavior_potential?: number
  available_bonuses?: Record<string, {
    icon: string
    title: string
    amount: number
    progress?: {
      current: number
      target: number
    }
  }>
}

export interface AuditLog {
  id: string
  child_id: string
  action_type: string
  action_by: string
  coins_change: number | null
  money_change: number | null
  description: string
  icon: string
  coins_before: number | null
  coins_after: number | null
  money_before: number | null
  money_after: number | null
  created_at: string
  is_suspicious: boolean
  requires_review: boolean
  parent_reviewed: boolean
  metadata: Record<string, any>
  related_type?: string | null
}
