// lib/repositories/day-blocks.repo.ts
// Supabase queries for the family-configurable day-blocks model (day_blocks /
// day_block_entries). Family-config / day-data (NOT money tables) — config
// reads are family-wide, but day_blocks INSERT/UPDATE/DELETE are rejected by
// RLS for non-parent/extended members (kid-role UI must hide the controls,
// RLS is the backstop). day_block_entries writes are family-wide — a kid may
// record their own completions; who_fills is enforced in the UI and the
// award route, not by entries RLS. Do NOT import lib/supabase/admin here.

import { supabase } from '../supabase'
import { normalizeDate } from '@/utils/helpers'
import type { DayBlock, DayBlockEntry } from '../models/day-block.types'

// ============================================================================
// READS
// ============================================================================

export async function getDayBlocks(
  familyId: string,
  { childId, activeOnly = true }: { childId?: string; activeOnly?: boolean } = {}
): Promise<DayBlock[]> {
  let query = supabase
    .from('day_blocks')
    .select('*')
    .eq('family_id', familyId)

  if (childId) {
    query = query.or(`child_id.is.null,child_id.eq.${childId}`)
  } else {
    query = query.is('child_id', null)
  }

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as DayBlock[]

  // When a per-child override row and a family-default row share a
  // legacy_key, prefer the child-specific one. Custom blocks (keyed by id,
  // legacy_key NULL) are all kept.
  if (!childId) return rows

  const byLegacyKey = new Map<string, DayBlock>()
  const customBlocks: DayBlock[] = []

  for (const row of rows) {
    if (!row.legacy_key) {
      customBlocks.push(row)
      continue
    }
    const existing = byLegacyKey.get(row.legacy_key)
    if (!existing || (row.child_id !== null && existing.child_id === null)) {
      byLegacyKey.set(row.legacy_key, row)
    }
  }

  return [...Array.from(byLegacyKey.values()), ...customBlocks].sort((a, b) => a.sort_order - b.sort_order)
}

export async function getDayBlockEntries(childId: string, date: string): Promise<DayBlockEntry[]> {
  const { data, error } = await supabase
    .from('day_block_entries')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))

  if (error) throw error
  return (data ?? []) as DayBlockEntry[]
}

export async function getFamilyDayBlocksEnabled(familyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('families')
    .select('day_blocks_enabled')
    .eq('id', familyId)
    .maybeSingle()

  if (error) throw error
  return (data as { day_blocks_enabled?: boolean } | null)?.day_blocks_enabled ?? false
}

// ============================================================================
// DAY-DATA WRITE
// ============================================================================

/**
 * Upserts one day_block_entries row per passed block for a child+date. Writes
 * ALL passed entries (done true or false) so unchecking a previously-checked
 * block persists — callers must pass the full block state, not just deltas.
 */
export async function saveDayBlockEntries(
  childId: string,
  date: string,
  entries: { blockId: string; done: boolean }[]
): Promise<DayBlockEntry[]> {
  if (entries.length === 0) return []

  // Fetch family_id from children table (required by RLS policy on
  // day_block_entries), mirroring saveRoomChecks's family_id resolution.
  const { data: childRow } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .single()

  const normalizedDate = normalizeDate(date)

  const rows = entries.map(({ blockId, done }) => ({
    child_id: childId,
    family_id: childRow?.family_id ?? null,
    date: normalizedDate,
    block_id: blockId,
    done,
  }))

  const { data, error } = await supabase
    .from('day_block_entries')
    .upsert(rows, { onConflict: 'child_id,date,block_id' })
    .select()

  if (error) throw error
  return (data ?? []) as DayBlockEntry[]
}

// ============================================================================
// PARENT CRUD
// ============================================================================

export async function addDayBlock(params: {
  familyId: string
  childId?: string | null
  name: string
  icon?: string | null
  price?: number | null
  dayTypes?: string[]
  whoFills?: 'kid' | 'parent' | 'both'
  sortOrder?: number
}): Promise<DayBlock> {
  // Custom blocks always have legacy_key NULL — only the seed function
  // creates legacy-mapped blocks.
  const { data, error } = await supabase
    .from('day_blocks')
    .insert({
      family_id: params.familyId,
      child_id: params.childId ?? null,
      legacy_key: null,
      name: params.name,
      icon: params.icon ?? null,
      price: params.price ?? null,
      day_types: params.dayTypes ?? [],
      who_fills: params.whoFills ?? 'both',
      sort_order: params.sortOrder ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as DayBlock
}

export async function updateDayBlock(
  id: string,
  fields: {
    name?: string
    icon?: string | null
    price?: number | null
    day_types?: string[]
    who_fills?: 'kid' | 'parent' | 'both'
    multipliers?: Record<string, number>
    schedule_link?: string | null
    days_of_week?: number[]
  }
): Promise<void> {
  const { error } = await supabase
    .from('day_blocks')
    .update(fields)
    .eq('id', id)

  if (error) throw error
}

export async function setDayBlockActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('day_blocks')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw error
}

/** Updates sort_order for each block to match its index in orderedIds. */
export async function reorderDayBlocks(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('day_blocks')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])

    if (error) throw error
  }
}

/**
 * Deletes a day_blocks row. The DB BEFORE DELETE guard (Plan 01) rejects
 * direct deletes of legacy-mapped blocks (legacy_key NOT NULL) — that error
 * surfaces here rather than being swallowed, so the caller (e.g. the settings
 * editor) can show "deactivate instead" messaging. The 3 seeded custom
 * "previously-free" blocks are ordinary custom rows — deletable freely.
 */
export async function deleteDayBlock(id: string): Promise<void> {
  const { error } = await supabase
    .from('day_blocks')
    .delete()
    .eq('id', id)

  if (error) throw error
}
