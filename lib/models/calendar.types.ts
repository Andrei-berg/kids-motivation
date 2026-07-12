// Types for the per-family configurable year calendar (Phase 5.5).
// See supabase/migrations/05.5-01-family-calendar.sql for the table DDL.

export type TermMode = 'quarters' | 'trimesters'

export type FamilyCalendar = {
  id: string
  family_id: string
  year_start: string // 'YYYY-MM-DD'
  year_end: string // 'YYYY-MM-DD'
  term_mode: TermMode
  weekend_days: number[] // getDay() indices; default [0, 6] = Sun, Sat
  region_preset: string | null
  created_at: string
  updated_at: string
}
