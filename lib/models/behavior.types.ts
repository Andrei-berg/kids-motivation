// Types for the family-configurable behavior tags (Phase 5.9).
// Mirrors lib/models/room.types.ts (RoomTask/RoomCheck) shape 1:1.

export type BehaviorTag = {
  id: string
  family_id: string
  name: string
  icon: string | null
  price: number
  legacy_key: 'good_behavior' | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type BehaviorMark = {
  id: string
  child_id: string
  family_id: string
  date: string
  tag_id: string
  status: 'pending' | 'approved' | 'rejected'
  proposed_by: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
}
