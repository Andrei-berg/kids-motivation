// lib/repositories/room.repo.ts
// Supabase queries for the family-configurable room checklist (room_tasks/room_checks).
// Family-config / day-data (NOT money tables) — writes go through the browser
// client under family RLS, mirroring lib/repositories/children.repo.ts and
// lib/repositories/categories.repo.ts. Do NOT import lib/supabase/admin here.

import { supabase } from '../supabase'
import { normalizeDate } from '@/utils/helpers'
import type { RoomTask, RoomCheck } from '../models/room.types'

// ============================================================================
// READS
// ============================================================================

export async function getRoomTasks(
  familyId: string,
  { activeOnly = true }: { activeOnly?: boolean } = {}
): Promise<RoomTask[]> {
  let query = supabase
    .from('room_tasks')
    .select('*')
    .eq('family_id', familyId)

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as RoomTask[]
}

export async function getRoomChecks(childId: string, date: string): Promise<RoomCheck[]> {
  const { data, error } = await supabase
    .from('room_checks')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))

  if (error) throw error
  return (data ?? []) as RoomCheck[]
}

// ============================================================================
// DAY-DATA WRITE
// ============================================================================

/**
 * Upserts one room_checks row per passed task for a child+date. Writes ALL
 * passed tasks (done true or false) so unchecking a previously-checked task
 * persists — callers must pass the full checklist state, not just the deltas.
 */
export async function saveRoomChecks(
  childId: string,
  date: string,
  checks: { taskId: string; done: boolean }[]
): Promise<RoomCheck[]> {
  if (checks.length === 0) return []

  // Fetch family_id from children table (required by RLS policy on room_checks),
  // mirroring saveDay's family_id resolution in children.repo.ts.
  const { data: childRow } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .single()

  const normalizedDate = normalizeDate(date)

  const rows = checks.map(({ taskId, done }) => ({
    child_id: childId,
    family_id: childRow?.family_id ?? null,
    date: normalizedDate,
    task_id: taskId,
    done,
  }))

  const { data, error } = await supabase
    .from('room_checks')
    .upsert(rows, { onConflict: 'child_id,date,task_id' })
    .select()

  if (error) throw error
  return (data ?? []) as RoomCheck[]
}

// ============================================================================
// PARENT CRUD
// ============================================================================

export async function addRoomTask(params: {
  familyId: string
  name: string
  icon?: string | null
  sortOrder?: number
}): Promise<RoomTask> {
  // Custom tasks always have legacy_key NULL — only the seed function creates
  // legacy-mapped tasks.
  const { data, error } = await supabase
    .from('room_tasks')
    .insert({
      family_id: params.familyId,
      name: params.name,
      icon: params.icon ?? null,
      legacy_key: null,
      sort_order: params.sortOrder ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as RoomTask
}

export async function updateRoomTask(
  id: string,
  fields: { name?: string; icon?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('room_tasks')
    .update(fields)
    .eq('id', id)

  if (error) throw error
}

export async function setRoomTaskActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('room_tasks')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw error
}

/** Updates sort_order for each task to match its index in orderedIds. */
export async function reorderRoomTasks(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('room_tasks')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])

    if (error) throw error
  }
}

/**
 * Deletes a room_tasks row. The DB BEFORE DELETE guard (Plan 01) rejects direct
 * deletes of legacy-mapped tasks (legacy_key NOT NULL) — that error surfaces
 * here rather than being swallowed, so the caller (e.g. the settings editor)
 * can show "deactivate instead" messaging.
 */
export async function deleteRoomTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('room_tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}
