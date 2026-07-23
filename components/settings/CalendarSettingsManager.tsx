'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getFamilyCalendar, upsertFamilyCalendar } from '@/lib/repositories/calendar.repo'
import type { TermMode } from '@/lib/models/calendar.types'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'

// getDay() indices: Sun=0 … Sat=6 — matches lib/day-type.ts's weekend_days convention.
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const
const WEEKDAY_I18N_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

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
      } else {
        // D-08: no row yet — legacy defaults (hardcoded sat+sun weekend, no school year).
        setYearStart('')
        setYearEnd('')
        setTermMode('quarters')
        setWeekendDays([0, 6])
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
      setError(t('settings.calendarSettingsManager.datesRequiredError'))
      return
    }
    if (yearStart > yearEnd) {
      setError(t('settings.calendarSettingsManager.dateOrderError'))
      return
    }
    setSaving(true)
    try {
      await upsertFamilyCalendar(familyId, {
        year_start: yearStart,
        year_end: yearEnd,
        term_mode: termMode,
        weekend_days: weekendDays,
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
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          📅 {t('settings.calendarSettingsManager.title')}
        </div>
        <div style={{ fontSize: 13, color: T.muted }}>
          {t('settings.calendarSettingsManager.subtitle')}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 8, color: T.danger, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 12px', background: T.successSoft, border: `1px solid ${T.success}55`, borderRadius: 8, color: T.success, fontSize: 13, marginBottom: 12 }}>
          {t('settings.calendarSettingsManager.saveSuccess')}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: T.muted, fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : (
        <div style={{ background: T.indigoSoft, border: `1px solid ${T.cardBorderHi}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* School-year dates */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                {t('settings.calendarSettingsManager.yearStart')}
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
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                {t('settings.calendarSettingsManager.yearEnd')}
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
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              {t('settings.calendarSettingsManager.termMode')}
            </label>
            <div style={{ display: 'flex', background: T.bg1, borderRadius: 10, padding: 4, gap: 4, border: `1px solid ${T.cardBorder}` }}>
              {(['quarters', 'trimesters'] as TermMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setTermMode(mode); setSuccess(false) }}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: termMode === mode ? T.indigo : 'transparent',
                    color: termMode === mode ? T.text : T.muted,
                  }}
                >
                  {t(`settings.calendarSettingsManager.${mode}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Weekend days */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              {t('settings.calendarSettingsManager.weekend')}
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
                      border: `1.5px solid ${active ? T.indigo : T.cardBorder}`,
                      background: active ? T.indigo : T.card,
                      color: active ? T.text : T.muted,
                    }}
                  >
                    {t(`settings.calendarSettingsManager.days.${WEEKDAY_I18N_KEYS[idx]}`)}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 800, borderRadius: 10, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: T.indigo, color: T.text,
            }}
          >
            {saving ? '…' : t('settings.calendarSettingsManager.save')}
          </button>
        </div>
      )}
    </div>
  )
}
