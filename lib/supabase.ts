   import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для TypeScript
export type Child = {
  id: string
  name: string
  emoji: string
  age: number
  active: boolean
  base_weekly: number
  created_at: string
}

export type Day = {
  id: string
  child_id: string
  date: string
  room_clean: boolean
  diary_done: boolean
  note_parent: string | null
  created_at: string
}

export type SubjectGrade = {
  id: string
  child_id: string
  date: string
  subject: string
  grade: number
  note: string | null
  created_at: string
}

export type Goal = {
  id: string
  child_id: string
  title: string
  target: number
  current: number
  active: boolean
  archived: boolean
  created_at: string
}

export type Week = {
  id: string
  child_id: string
  week_start: string
  week_end: string
  all5: boolean
  extra_bonus: number
  penalties_manual: number
  note_parent: string | null
  base: number
  study_total: number
  room_bonus: number
  streak_bonuses: number
  extra_applied: number
  penalties_total: number
  total: number
  finalized: boolean
  finalized_at: string | null
  created_at: string
}

export type Settings = {
  [key: string]: string | number | boolean
}
