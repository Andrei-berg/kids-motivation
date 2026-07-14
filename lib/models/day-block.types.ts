// Types for the family-configurable day-blocks model (Phase 5.6).
// See supabase/migrations/05.6-01-day-blocks.sql for the table DDL.
// seed_key is a DB-only idempotency column for the 3 auto-seeded
// "previously-free" custom defaults — no need to surface it on the TS type;
// select('*') rows carry it harmlessly.

export type DayBlockLegacyKey =
  | 'room'
  | 'behavior'
  | 'grade'
  | 'sport'
  | 'activity'
  | 'book'
  | 'exercise'

export type DayBlock = {
  id: string
  family_id: string
  child_id: string | null
  legacy_key: DayBlockLegacyKey | null
  name: string
  icon: string | null
  price: number | null
  day_types: string[]
  days_of_week: number[]
  // RESERVED for Phase 5.8 Day Constructor — not read anywhere in 5.6
  schedule_link: string | null
  who_fills: 'kid' | 'parent' | 'both'
  multipliers: Record<string, number>
  sort_order: number
  is_active: boolean
  created_at: string
}

export type DayBlockEntry = {
  id: string
  child_id: string
  family_id: string
  date: string
  block_id: string
  done: boolean
  created_at: string
}
