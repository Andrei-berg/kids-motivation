// lib/schedule-api.ts
// CRUD for schedule_items: unified lessons, sections, and routine slots per child.
// Distinct from lib/flexible-api.ts (old school-only schedule) — do NOT import from flexible-api.ts here.

import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleItem {
  id: string
  family_id: string
  child_member_id: string
  type: 'lesson' | 'section' | 'routine'
  title: string
  day_of_week: number[]   // 1=Mon, 2=Tue, ..., 7=Sun
  start_time: string | null   // "HH:MM:SS"
  end_time: string | null     // "HH:MM:SS"
  location: string | null
  reminder_offset: number     // minutes before start_time
  has_reminder: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getScheduleItems(
  familyId: string,
  childMemberId: string
): Promise<ScheduleItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('family_id', familyId)
    .eq('child_member_id', childMemberId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getScheduleItems: ${error.message}`)
  return data ?? []
}

export async function createScheduleItem(
  familyId: string,
  childMemberId: string,
  fields: Pick<ScheduleItem, 'type' | 'title' | 'day_of_week'> &
    Partial<Omit<ScheduleItem, 'id' | 'family_id' | 'child_member_id' | 'type' | 'title' | 'day_of_week' | 'created_at'>>
): Promise<ScheduleItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schedule_items')
    .insert({
      family_id: familyId,
      child_member_id: childMemberId,
      reminder_offset: 15,
      has_reminder: false,
      is_active: true,
      ...fields,
    })
    .select()
    .single()
  if (error) throw new Error(`createScheduleItem: ${error.message}`)
  return data
}

export async function updateScheduleItem(
  itemId: string,
  fields: Partial<Omit<ScheduleItem, 'id' | 'family_id' | 'child_member_id' | 'created_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('schedule_items')
    .update(fields)
    .eq('id', itemId)
  if (error) throw new Error(`updateScheduleItem: ${error.message}`)
}

export async function deleteScheduleItem(itemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', itemId)
  if (error) throw new Error(`deleteScheduleItem: ${error.message}`)
}
