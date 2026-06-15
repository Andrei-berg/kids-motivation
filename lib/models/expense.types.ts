// Types extracted from lib/expenses-api.ts

export interface ExpenseCategory {
  id: string
  name: string
  icon: string
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  child_id: string
  title: string
  amount: number
  category_id: string
  date: string
  is_recurring: boolean
  recurring_period: string | null
  note: string | null
  created_by: string
  created_at: string
  // Set for rows auto-generated from a section's monthly cost (migration 04.4-06).
  // section_id = source section; period = 'YYYY-MM' the row represents.
  section_id?: string | null
  period?: string | null
  category?: ExpenseCategory
}

export interface Section {
  id: string
  child_id: string
  name: string
  schedule: any
  cost: number | null
  trainer: string | null
  address: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  schedule_days: string[]
  created_at: string
}

export interface SectionVisit {
  id: string
  section_id: string
  date: string
  attended: boolean
  progress_note: string | null
  trainer_feedback: string | null
  created_at: string
}

export interface ExpenseStats {
  total: number
  byCategory: { categoryId: string; categoryName: string; icon: string; amount: number; percentage: number }[]
  byChild: { childId: string; amount: number; percentage: number }[]
}

// ─── Extra Activities ─────────────────────────────────────────────────────────

export interface ExtraActivity {
  id: string
  child_id: string
  family_id: string | null
  name: string
  emoji: string
  /** 'school' | 'weekend' | 'vacation' | 'always' — which day types to show */
  day_types: string[]
  /** 'academic' | 'physical' | 'creative' | 'chore' | 'other' */
  category: string
  /** 'checkbox' | 'pages' | 'duration' | 'rating' */
  tracking_type: string
  /** 0=Mon … 6=Sun; empty = all days */
  days_of_week: number[]
  quantity_goal: number | null
  quantity_unit: string | null
  coins: number
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  child_id: string
  date: string
  activity_id: string
  done: boolean
  note: string | null
  quantity_done: number | null
  duration_minutes: number | null
  rating: number | null
  bookmark_page: number | null
  created_at: string
}
