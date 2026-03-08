// Types extracted from lib/categories-api.ts

export interface Category {
  id: string
  family_id: string
  name: string
  icon: string
  color: string | null
  type: 'study' | 'home' | 'sport' | 'routine' | 'custom'
  is_active: boolean
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface Task {
  id: string
  family_id: string
  category_id: string
  child_member_id: string | null  // null = applies to all children
  title: string
  description: string | null
  coins_reward: number
  coins_penalty: number
  is_required: boolean
  is_active: boolean
  reminder_time: string | null    // HH:MM:SS format
  notification_text: string | null
  monthly_cap: number | null      // null = no cap
  sort_order: number
  created_at: string
}
