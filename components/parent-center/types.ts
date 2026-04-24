import type { RewardPurchase, Reward } from '@/lib/models/wallet.types'

export type { RewardPurchase, Reward }

export type ParentChild = {
  id: string
  name: string
  avatar: string    // emoji
  age: number
  level: number
  xp: number
  balance: number
  streak: number
  accent: string
  todayPct: number
  todayDone: number
  todayTotal: number
  mode: 1 | 2 | 3
  week: number[]    // last 7 days coins
  subjects: string[]
  badges: number
  goal: { title: string; saved: number; target: number }
}

export type ActivityEntry = {
  who: string
  text: string
  type: 'earn_coins' | 'penalty' | 'bonus'
  amt: number
  time: string
}

export type ActionType = 'reward' | 'penalty' | 'bonus' | 'freeze'

export type ToastState = { msg: string; tone?: 'warn' | 'danger' } | null

export type ModalState = { open: boolean; child: ParentChild | null; action: ActionType | null }

export type Route = 'dashboard' | 'children' | 'tasks' | 'shop' | 'analytics' | 'settings' | 'child'
