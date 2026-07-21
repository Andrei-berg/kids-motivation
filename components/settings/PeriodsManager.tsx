'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { getVacationPeriods, createVacationPeriod, updateVacationPeriod, deleteVacationPeriod, VacationPeriod } from '@/lib/vacation-api'
import { listPresets, applyPreset, type ApplyPresetMode } from '@/lib/vacation-presets'
import { upsertFamilyCalendar } from '@/lib/repositories/calendar.repo'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'



const EMOJIS = ['🌸', '🌴', '❄️', '🍂', '🎄', '☀️', '🌊', '⛷️']

interface ChildOption {
  id: string
  name: string
}

export default function PeriodsManager() {
  const t = useT()
  const { familyId, setFamilyId, activeMemberId } = useAppStore()
  const [children, setChildren] = useState<ChildOption[]>([])
  const [periods, setPeriods] = useState<VacationPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [emoji, setEmoji] = useState('🌸')
  const [childFilter, setChildFilter] = useState('all')

  const presets = listPresets()
  const [selectedPresetId, setSelectedPresetId] = useState(() => presets[0]?.id ?? '')
  const [applyingPreset, setApplyingPreset] = useState(false)
  const [applyStatus, setApplyStatus] = useState('')

  useEffect(() => {
    async function init() {
      // 1. Store has familyId
      if (familyId) { loadData(familyId); return }
      // 2. Try family_members table
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('family_members').select('family_id').eq('user_id', user.id).maybeSingle()
          if (data?.family_id) { setFamilyId(data.family_id); loadData(data.family_id); return }
        }
      } catch { /* table may not exist */ }
      // 3. Fall back to activeMemberId (old schema — use child id as family id)
      if (activeMemberId) { loadData(activeMemberId); return }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, activeMemberId])

  async function loadData(fid: string) {
    try {
      const supabase = createClient()

      // WR-03: vacation_periods.child_filter must hold children.id — that is
      // what getDayType matches against (updateStreaks/DailyModal/kid day page
      // all pass children.id). Use family_members.child_id, NOT
      // family_members.id, as the picker value.
      const { data: childRows } = await supabase
        .from('family_members')
        .select('id, child_id, display_name')
        .eq('family_id', fid)
        .eq('role', 'child')
        .order('created_at')

      setChildren((childRows || [])
        .filter(c => c.child_id)
        .map(c => ({
          id: c.child_id as string,
          name: c.display_name || 'Child',
        })))

      const data = await getVacationPeriods(fid)
      setPeriods(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function openEdit(p: VacationPeriod) {
    setEditingId(p.id)
    setName(p.name)
    setEmoji(p.emoji)
    setStartDate(p.start_date)
    setEndDate(p.end_date)
    setChildFilter(p.child_filter)
    setShowForm(true)
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setSaveError('')
    setName(''); setStartDate(''); setEndDate(''); setEmoji('🌸'); setChildFilter('all')
  }

  async function handleSave() {
    setSaveError('')
    if (!familyId) { setSaveError(t('common.error')); return }
    if (!name.trim()) { setSaveError(t('settings.periodsManager.name')); return }
    if (!startDate || !endDate) { setSaveError(t('settings.periodsManager.start')); return }
    if (startDate > endDate) { setSaveError(t('settings.periodsManager.start')); return }
    try {
      setSaving(true)
      if (editingId) {
        await updateVacationPeriod(editingId, {
          name: name.trim(), start_date: startDate, end_date: endDate, emoji, child_filter: childFilter,
        })
      } else {
        await createVacationPeriod({
          family_id: familyId, name: name.trim(), start_date: startDate, end_date: endDate, emoji, child_filter: childFilter,
        })
      }
      resetForm()
      const data = await getVacationPeriods(familyId)
      setPeriods(data)
    } catch (e) {
      console.error(e)
      setSaveError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('settings.periodsManager.deleteConfirm'))) return
    await deleteVacationPeriod(id)
    setPeriods(periods.filter(p => p.id !== id))
  }

  async function handleApplyPreset() {
    if (!familyId || !selectedPresetId) return
    const hasExisting = periods.some(p => p.preset_id === selectedPresetId)
    let mode: ApplyPresetMode = 'add-missing'
    if (hasExisting) {
      // D-04: reuse the confirm() convention (see handleDelete) instead of a new modal —
      // OK maps to Replace-preset-periods, Cancel maps to Add-missing-only.
      mode = confirm(t('settings.periodsManager.presetPicker.confirmReplaceOrAdd')) ? 'replace' : 'add-missing'
    }
    try {
      setApplyingPreset(true)
      setApplyStatus('')
      const inserted = await applyPreset(familyId, selectedPresetId, mode)
      // WARNING-1 resolution: keep family_calendar.region_preset in sync with the
      // applied preset so Settings→Calendar's region select (Plan 04) reflects it too.
      await upsertFamilyCalendar(familyId, { region_preset: selectedPresetId })
      await loadData(familyId)
      setApplyStatus(t('settings.periodsManager.presetPicker.appliedCount', { count: inserted }))
    } catch (e) {
      console.error(e)
      setApplyStatus(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setApplyingPreset(false)
    }
  }

  function formatDateRange(start: string, end: string) {
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    const days = Math.floor((new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86400000) + 1
    return `${fmt(start)} – ${fmt(end)} · ${days} ${days === 1 ? 'day' : 'days'}`
  }

  function childFilterLabel(filter: string) {
    if (filter === 'all') return 'All children'
    const child = children.find(c => c.id === filter)
    return child ? child.name : filter
  }

  if (loading) return <div style={{ color: T.muted, fontSize: 13 }}>{t('common.loading')}</div>

  return (
    <div>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
        {t('settings.periodsManager.title')}
      </p>

      {/* WR-05: the hardcoded "rules reminder" banner was removed — it
          advertised reading-threshold / extra-lesson / home-help coins that
          /api/wallet/award never credits, at amounts that ignored the
          per-family wallet_settings. */}

      {/* Period list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {periods.length === 0 && !showForm && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '24px 0', border: `1px dashed ${T.cardBorder}`, borderRadius: 12 }}>
            {t('settings.periodsManager.addPeriod')}
          </div>
        )}
        {periods.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.cardBorder}` }}>
            <div style={{ fontSize: 24 }}>{p.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: T.text, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {p.name}
                {p.preset_id != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: T.indigoHi, background: T.indigoSoft, border: `1px solid ${T.cardBorderHi}`, borderRadius: 999, padding: '2px 8px' }}>
                    📅 {t('settings.periodsManager.presetBadge')}
                  </span>
                )}
              </div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{formatDateRange(p.start_date, p.end_date)}</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{childFilterLabel(p.child_filter)}</div>
            </div>
            <button
              onClick={() => openEdit(p)}
              style={{ color: T.muted, background: 'none', border: 'none', padding: 4, fontSize: 13, cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.indigoHi }}
              onMouseLeave={e => { e.currentTarget.style.color = T.muted }}
              title={t('common.edit')}
            >✏️</button>
            <button
              onClick={() => handleDelete(p.id)}
              style={{ color: T.muted, background: 'none', border: 'none', padding: 4, fontSize: 13, cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.danger }}
              onMouseLeave={e => { e.currentTarget.style.color = T.muted }}
              title={t('settings.periodsManager.deleteConfirm')}
            >🗑</button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, color: T.text, marginBottom: 16 }}>{editingId ? t('common.edit') : t('settings.periodsManager.addPeriod')}</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{t('settings.periodsManager.name')}</label>
            <input
              style={{ width: '100%', background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.text, fontSize: 13, padding: '10px 12px', outline: 'none' }}
              placeholder={t('settings.periodsManager.name')}
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = T.indigo }}
              onBlur={e => { e.currentTarget.style.borderColor = T.cardBorder }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{t('settings.periodsManager.start')}</label>
              <input
                type="date"
                style={{ width: '100%', background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.text, fontSize: 13, padding: '10px 12px', outline: 'none' }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = T.indigo }}
                onBlur={e => { e.currentTarget.style.borderColor = T.cardBorder }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{t('settings.periodsManager.end')}</label>
              <input
                type="date"
                style={{ width: '100%', background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.text, fontSize: 13, padding: '10px 12px', outline: 'none' }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = T.indigo }}
                onBlur={e => { e.currentTarget.style.borderColor = T.cardBorder }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{t('settings.categoryManager.emoji')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  style={{
                    width: 40, height: 40, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${emoji === e ? T.indigo : T.cardBorder}`,
                    background: emoji === e ? T.indigoSoft : T.bg1,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{e}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{t('settings.periodsManager.type')}</label>
            <div style={{ display: 'flex', background: T.bg1, borderRadius: 8, padding: 4, gap: 4, border: `1px solid ${T.cardBorder}`, flexWrap: 'wrap' }}>
              {[{ val: 'all', label: 'All children' }, ...children.map(c => ({ val: c.id, label: c.name }))].map(opt => (
                <button key={opt.val} onClick={() => setChildFilter(opt.val)}
                  style={{
                    flex: 1, minWidth: 60, padding: '8px 0', fontSize: 12, fontWeight: 800, borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: childFilter === opt.val ? T.indigo : 'transparent',
                    color: childFilter === opt.val ? '#fff' : T.muted,
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {saveError && (
            <div style={{ background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 8, color: T.danger, fontSize: 13, padding: '8px 12px', marginBottom: 12 }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '10px 0', background: T.indigo, color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, transition: 'opacity 0.15s' }}>
              {saving ? '...' : t('settings.periodsManager.save')}
            </button>
            <button onClick={resetForm}
              style={{ padding: '10px 16px', background: T.card, color: T.muted, fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px solid ${T.cardBorder}`, cursor: 'pointer' }}>
              {t('settings.periodsManager.cancel')}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          {/* Region preset picker */}
          <div style={{ marginBottom: 16, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {t('settings.periodsManager.presetPicker.title')}
            </div>
            <div style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>
              {t('settings.periodsManager.presetPicker.hint')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                style={{ flex: 1, background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: 8, color: T.text, fontSize: 13, padding: '10px 12px', outline: 'none' }}
                value={selectedPresetId}
                onChange={e => { setSelectedPresetId(e.target.value); setApplyStatus('') }}
                onFocus={e => { e.currentTarget.style.borderColor = T.indigo }}
                onBlur={e => { e.currentTarget.style.borderColor = T.cardBorder }}
              >
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>
              <button
                onClick={handleApplyPreset}
                disabled={!selectedPresetId || applyingPreset}
                style={{ padding: '10px 16px', background: T.indigo, color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 8, border: 'none', cursor: (!selectedPresetId || applyingPreset) ? 'not-allowed' : 'pointer', opacity: (!selectedPresetId || applyingPreset) ? 0.5 : 1, whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
              >
                {applyingPreset ? '...' : t('settings.periodsManager.presetPicker.apply')}
              </button>
            </div>
            {applyStatus && (
              <div style={{ color: T.indigoHi, fontSize: 12, marginTop: 8 }}>{applyStatus}</div>
            )}
          </div>

          <button onClick={() => setShowForm(true)}
            style={{
              width: '100%', padding: 12, border: `2px dashed ${T.cardBorder}`, color: T.muted, fontWeight: 800, fontSize: 13, borderRadius: 12,
              background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.indigo; e.currentTarget.style.color = T.indigo }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.cardBorder; e.currentTarget.style.color = T.muted }}
          >
            + {t('settings.periodsManager.addPeriod')}
          </button>
        </>
      )}
    </div>
  )
}
