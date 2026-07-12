// Bundled regional vacation preset directory (Phase 5.5 Plan 03, D-01/D-03).
// Static JSON imports — no runtime fetch. Types live here to avoid a circular
// import with lib/vacation-presets.ts (which re-exports them and consumes PRESETS).

import type { TermMode } from '@/lib/models/calendar.types'

import ruQuarters from './ru-quarters.json'
import ruMoscowTrimesters from './ru-moscow-trimesters.json'
import kz from './kz.json'
import by from './by.json'

export type PresetPeriod = {
  name: string
  emoji: string
  start_date: string
  end_date: string
}

export type VacationPreset = {
  id: string
  region: string
  label: string
  termMode: TermMode
  periods: PresetPeriod[]
}

export const PRESETS: VacationPreset[] = [ruQuarters, ruMoscowTrimesters, kz, by]
