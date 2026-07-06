// Types for the family-configurable room checklist (Phase 5.2).
// See supabase/migrations/05.2-01-room-tasks.sql for the table DDL.

export type RoomLegacyKey = 'bed' | 'floor' | 'desk' | 'closet' | 'trash'

export type RoomTask = {
  id: string
  family_id: string
  name: string
  icon: string | null
  legacy_key: RoomLegacyKey | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type RoomCheck = {
  id: string
  child_id: string
  family_id: string
  date: string
  task_id: string
  done: boolean
  created_at: string
}
