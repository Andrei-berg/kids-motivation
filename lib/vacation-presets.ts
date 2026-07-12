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
 * - 'replace': deletes only this preset's previously-materialized rows
 *   (scoped by family_id + preset_id — never touches manual rows or another
 *   preset's rows, D-04), then inserts the full preset fresh.
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

  if (mode === 'replace') {
    const { error: deleteError } = await supabase
      .from('vacation_periods')
      .delete()
      .eq('family_id', familyId)
      .eq('preset_id', presetId)
    if (deleteError) throw deleteError
  } else {
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

  const { error: insertError } = await supabase.from('vacation_periods').insert(rows)
  if (insertError) throw insertError

  return rows.length
}
