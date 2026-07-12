// lib/repositories/calendar.repo.ts
// Supabase queries for the per-family configurable year calendar (family_calendar).
// Family-config table (NOT a money table) — writes go through the browser
// client under family RLS, mirroring lib/repositories/room.repo.ts and
// lib/repositories/children.repo.ts. This is the client-write path — the
// service-role admin client must NOT be imported into this file.

import { supabase } from '../supabase'
import type { FamilyCalendar } from '../models/calendar.types'

// ============================================================================
// READS
// ============================================================================

/** Returns the family's calendar row, or null if none exists (D-08 legacy-default case). */
export async function getFamilyCalendar(familyId: string): Promise<FamilyCalendar | null> {
  const { data, error } = await supabase
    .from('family_calendar')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as FamilyCalendar | null
}

// ============================================================================
// WRITE
// ============================================================================

/** Upserts the family's calendar row (one row per family, keyed by family_id). */
export async function upsertFamilyCalendar(
  familyId: string,
  fields: Partial<
    Pick<FamilyCalendar, 'year_start' | 'year_end' | 'term_mode' | 'weekend_days' | 'region_preset'>
  >
): Promise<void> {
  const { error } = await supabase
    .from('family_calendar')
    .upsert(
      { family_id: familyId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'family_id' }
    )

  if (error) throw error
}
