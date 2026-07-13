// lib/vacation-presets.ts
// Preset loader + applyPreset service (Phase 5.5 Plan 03, D-01/D-02/D-04).
//
// Presets are a convenience that materializes rows into the existing
// vacation_periods table (preset_id marker column). Manual entry via
// PeriodsManager stays a first-class equal path — "manual wins" falls out
// naturally because materialized rows are edited/deleted like any other row,
// and replace-mode only ever touches rows carrying this preset's marker.

import { supabase } from './supabase'
import { PRESETS, type VacationPreset, type PresetPeriod } from '@/data/vacation-presets'
import { getVacationPeriods } from './vacation-api'

export type { VacationPreset, PresetPeriod }

export type ApplyPresetMode = 'replace' | 'add-missing'

export function listPresets(): VacationPreset[] {
  return PRESETS
}

/**
 * Materializes a bundled preset's periods into vacation_periods for a family.
 *
 * - 'replace': inserts the full preset fresh FIRST, then deletes only this
 *   preset's previously-materialized rows (scoped by family_id + preset_id +
 *   NOT-in-new-ids — never touches manual rows or another preset's rows,
 *   D-04). Insert-first ordering (WR-04) means a failed insert leaves the
 *   old rows intact; a failed delete leaves recoverable duplicates that the
 *   next replace-apply cleans up — never a window with the periods gone.
 * - 'add-missing': diffs against existing rows by (start_date, end_date, name)
 *   — the same identity PeriodsManager's alreadyAdded check uses — and
 *   inserts only periods not already present.
 *
 * Returns the number of rows inserted.
 */
export async function applyPreset(
  familyId: string,
  presetId: string,
  mode: ApplyPresetMode
): Promise<number> {
  const preset = PRESETS.find(p => p.id === presetId)
  if (!preset) throw new Error(`Unknown vacation preset: ${presetId}`)

  let periodsToInsert: PresetPeriod[] = preset.periods

  if (mode === 'add-missing') {
    const existing = await getVacationPeriods(familyId)
    periodsToInsert = preset.periods.filter(
      p =>
        !existing.some(
          e => e.start_date === p.start_date && e.end_date === p.end_date && e.name === p.name
        )
    )
  }

  if (periodsToInsert.length === 0) return 0

  const rows = periodsToInsert.map(p => ({
    family_id: familyId,
    name: p.name,
    emoji: p.emoji,
    start_date: p.start_date,
    end_date: p.end_date,
    child_filter: 'all',
    preset_id: presetId,
  }))

  const { data: insertedRows, error: insertError } = await supabase
    .from('vacation_periods')
    .insert(rows)
    .select('id')
  if (insertError) throw insertError

  if (mode === 'replace') {
    // Delete only the OLD rows for this preset — everything carrying the
    // preset marker except the rows just inserted.
    const newIds = (insertedRows ?? []).map(r => r.id as string)
    let deleteQuery = supabase
      .from('vacation_periods')
      .delete()
      .eq('family_id', familyId)
      .eq('preset_id', presetId)
    if (newIds.length > 0) {
      deleteQuery = deleteQuery.not('id', 'in', `(${newIds.join(',')})`)
    }
    const { error: deleteError } = await deleteQuery
    if (deleteError) throw deleteError
  }

  return rows.length
}
