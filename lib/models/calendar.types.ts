// Types for the per-family configurable year calendar (Phase 5.5).
// See supabase/migrations/05.5-01-family-calendar.sql for the table DDL.

export type TermMode = 'quarters' | 'trimesters'

export type FamilyCalendar = {
  id: string
  family_id: string
  // year_start/year_end/term_mode are nullable in the DDL (05.5-01) — a row
  // created by a region_preset-only upsert (PeriodsManager) has them NULL
  // until the parent fills in the Calendar settings screen (WR-07).
  year_start: string | null // 'YYYY-MM-DD'
  year_end: string | null // 'YYYY-MM-DD'
  term_mode: TermMode | null
  weekend_days: number[] // getDay() indices; default [0, 6] = Sun, Sat
  region_preset: string | null
  created_at: string
  updated_at: string
}
