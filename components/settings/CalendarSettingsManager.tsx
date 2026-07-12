'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getFamilyCalendar, upsertFamilyCalendar } from '@/lib/repositories/calendar.repo'
import type { TermMode } from '@/lib/models/calendar.types'
import { useT } from '@/lib/i18n'

// getDay() indices: Sun=0 … Sat=6 — matches lib/day-type.ts's weekend_days convention.
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const
const WEEKDAY_I18N_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

// Static region-preset options. Values mirror the preset ids Plan 05.5-03/05.5-05
// materialize into data/vacation-presets/*.json (ru-quarters, ru-moscow-trimesters,
// kz, by) so this select and PeriodsManager's preset-apply picker read/write the
// SAME family_calendar.region_preset values (WARNING-1 resolution) even though
// lib/vacation-presets.ts — built by a sibling wave-2 plan — is not importable here
// (see SUMMARY.md deviation note).
const REGION_OPTIONS = [
  { value: '', labelKey: 'regionNone' },
  { value: 'ru-quarters', labelKey: 'regionRuQuarters' },
  { value: 'ru-moscow-trimesters', labelKey: 'regionRuMoscowTrimesters' },
  { value: 'kz', labelKey: 'regionKz' },
  { value: 'by', labelKey: 'regionBy' },
] as const

export default function CalendarSettingsManager() {
  const t = useT()
  const { familyId } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [termMode, setTermMode] = useState<TermMode>('quarters')
  const [weekendDays, setWeekendDays] = useState<number[]>([0, 6])
  const [regionPreset, setRegionPreset] = useState('')

  useEffect(() => {
    if (familyId) load()
  }, [familyId])

  async function load() {
    if (!familyId) return
    setLoading(true)
    setError('')
    try {
      const cal = await getFamilyCalendar(familyId)
      if (cal) {
        setYearStart(cal.year_start ?? '')
        setYearEnd(cal.year_end ?? '')
        setTermMode(cal.term_mode ?? 'quarters')
        setWeekendDays(cal.weekend_days && cal.weekend_days.length > 0 ? cal.weekend_days : [0, 6])
        setRegionPreset(cal.region_preset ?? '')
      } else {
        // D-08: no row yet — legacy defaults (hardcoded sat+sun weekend, no school year).
        setYearStart('')
        setYearEnd('')
        setTermMode('quarters')
        setWeekendDays([0, 6])
        setRegionPreset('')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleWeekendDay(day: number) {
    setSuccess(false)
    setWeekendDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  async function handleSave() {
    setError('')
    setSuccess(false)
    if (!familyId) return
    if (!yearStart || !yearEnd) {
      setError(t('calendarSettingsManager.datesRequiredError'))
      return
    }
    if (yearStart > yearEnd) {
      setError(t('calendarSettingsManager.dateOrderError'))
      return
    }
    setSaving(true)
    try {
      await upsertFamilyCalendar(familyId, {
        year_start: yearStart,
        year_end: yearEnd,
        term_mode: termMode,
        weekend_days: weekendDays,
        region_preset: regionPreset || null,
      })
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          📅 {t('calendarSettingsManager.title')}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(238,238,255,0.5)' }}>
          {t('calendarSettingsManager.subtitle')}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, color: '#F43F5E', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', fontSize: 13, marginBottom: 12 }}>
          {t('calendarSettingsManager.saveSuccess')}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'rgba(238,238,255,0.4)', fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* School-year dates */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(238,238,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                {t('calendarSettingsManager.yearStart')}
              </label>
              <input
                type="date"
                className="premium-input"
                value={yearStart}
                onChange={e => { setYearStart(e.target.value); setSuccess(false) }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(238,238,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                {t('calendarSettingsManager.yearEnd')}
              </label>
              <input
                type="date"
                className="premium-input"
                value={yearEnd}
                onChange={e => { setYearEnd(e.target.value); setSuccess(false) }}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Term mode */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(238,238,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              {t('calendarSettingsManager.termMode')}
            </label>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, gap: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['quarters', 'trimesters'] as TermMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setTermMode(mode); setSuccess(false) }}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: termMode === mode ? 'rgba(99,102,241,0.8)' : 'transparent',
                    color: termMode === mode ? '#fff' : 'rgba(238,238,255,0.5)',
                  }}
                >
                  {t(`calendarSettingsManager.${mode}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Weekend days */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(238,238,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              {t('calendarSettingsManager.weekend')}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WEEKDAY_ORDER.map((day, idx) => {
                const active = weekendDays.includes(day)
                return (
                  <button
                    key={day}
                    onClick={() => toggleWeekendDay(day)}
                    style={{
                      width: 40, height: 32, fontSize: 12, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
                      border: `1.5px solid ${active ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#fff' : 'rgba(238,238,255,0.5)',
                    }}
                  >
                    {t(`calendarSettingsManager.days.${WEEKDAY_I18N_KEYS[idx]}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Region preset */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(238,238,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              {t('calendarSettingsManager.region')}
            </label>
            <select
              className="premium-select"
              value={regionPreset}
              onChange={e => { setRegionPreset(e.target.value); setSuccess(false) }}
              style={{ width: '100%' }}
            >
              {REGION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {t(`calendarSettingsManager.${opt.labelKey}`)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 800, borderRadius: 10, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: 'rgba(99,102,241,0.8)', color: '#fff',
            }}
          >
            {saving ? '…' : t('calendarSettingsManager.save')}
          </button>
        </div>
      )}
    </div>
  )
}
