// lib/repositories/behavior.repo.ts
// Supabase queries for the family-configurable behavior tags (behavior_tags/behavior_marks).
// Family-config / day-data (NOT money tables) — writes go through the browser
// client under family RLS, mirroring lib/repositories/room.repo.ts. Do NOT
// import the service-role admin client here. Only the approval/reject
// transition (status: pending -> approved/rejected) is money-adjacent and
// lives server-side (plan 07) — never in this file.

import { supabase } from '../supabase'
import { normalizeDate } from '@/utils/helpers'
import type { BehaviorTag, BehaviorMark } from '../models/behavior.types'

// ============================================================================
// READS
// ============================================================================

export async function getBehaviorTags(
  familyId: string,
  { activeOnly = true }: { activeOnly?: boolean } = {}
): Promise<BehaviorTag[]> {
  let query = supabase
    .from('behavior_tags')
    .select('*')
    .eq('family_id', familyId)

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as BehaviorTag[]
}

/** Reads all behavior_marks for a child+date, including their status. */
export async function getBehaviorMarks(childId: string, date: string): Promise<BehaviorMark[]> {
  const { data, error } = await supabase
    .from('behavior_marks')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))

  if (error) throw error
  return (data ?? []) as BehaviorMark[]
}

// ============================================================================
// CHILD PROPOSE (day-data write — pending only)
// ============================================================================

/**
 * Inserts a pending behavior_marks proposal for a child+date+tag. Always
 * writes status='pending' — the RLS INSERT WITH CHECK (plan 01) is the real
 * boundary that rejects a crafted client trying to set 'approved'/'rejected'
 * directly; this repo must never attempt anything but 'pending'. The actual
 * approve/reject transition lives server-side (plan 07), not here.
 */
export async function proposeMark(params: {
  childId: string
  date: string
  tagId: string
  proposedBy: string
}): Promise<BehaviorMark> {
  // Fetch family_id from children table (required by RLS policy on
  // behavior_marks), mirroring saveRoomChecks's family_id resolution in
  // room.repo.ts.
  const { data: childRow } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', params.childId)
    .single()

  const { data, error } = await supabase
    .from('behavior_marks')
    .insert({
      child_id: params.childId,
      family_id: childRow?.family_id ?? null,
      date: normalizeDate(params.date),
      tag_id: params.tagId,
      proposed_by: params.proposedBy,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as BehaviorMark
}

// ============================================================================
// PARENT CRUD
// ============================================================================

export async function addBehaviorTag(params: {
  familyId: string
  name: string
  icon?: string | null
  price: number
  sortOrder?: number
}): Promise<BehaviorTag> {
  // Custom tags always have legacy_key NULL — only the seed function creates
  // legacy-mapped tags.
  const { data, error } = await supabase
    .from('behavior_tags')
    .insert({
      family_id: params.familyId,
      name: params.name,
      icon: params.icon ?? null,
      price: params.price,
      legacy_key: null,
      sort_order: params.sortOrder ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as BehaviorTag
}

export async function updateBehaviorTag(
  id: string,
  fields: { name?: string; icon?: string | null; price?: number }
): Promise<void> {
  const { error } = await supabase
    .from('behavior_tags')
    .update(fields)
    .eq('id', id)

  if (error) throw error
}

export async function setBehaviorTagActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('behavior_tags')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw error
}

/** Updates sort_order for each tag to match its index in orderedIds. */
export async function reorderBehaviorTags(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('behavior_tags')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])

    if (error) throw error
  }
}

/**
 * Deletes a behavior_tags row. The DB BEFORE DELETE guard (Plan 01) rejects
 * direct deletes of legacy-mapped tags (legacy_key NOT NULL) — that error
 * surfaces here rather than being swallowed, so the caller (e.g. the settings
 * editor) can show "deactivate instead" messaging.
 */
export async function deleteBehaviorTag(id: string): Promise<void> {
  const { error } = await supabase
    .from('behavior_tags')
    .delete()
    .eq('id', id)

  if (error) throw error
}
