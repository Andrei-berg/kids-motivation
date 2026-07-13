'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { getVacationPeriods, createVacationPeriod, updateVacationPeriod, deleteVacationPeriod, VacationPeriod } from '@/lib/vacation-api'
import { listPresets, applyPreset, type ApplyPresetMode } from '@/lib/vacation-presets'
import { upsertFamilyCalendar } from '@/lib/repositories/calendar.repo'
import { useT } from '@/lib/i18n'



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

  if (loading) return <div className="text-gray-400 text-sm">{t('common.loading')}</div>

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        {t('settings.periodsManager.title')}
      </p>

      {/* WR-05: the hardcoded "rules reminder" banner was removed — it
          advertised reading-threshold / extra-lesson / home-help coins that
          /api/wallet/award never credits, at amounts that ignored the
          per-family wallet_settings. */}

      {/* Period list */}
      <div className="space-y-3 mb-4">
        {periods.length === 0 && !showForm && (
          <div className="text-gray-500 text-sm text-center py-6 border border-gray-700 rounded-xl border-dashed">
            {t('settings.periodsManager.addPeriod')}
          </div>
        )}
        {periods.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            <div className="text-2xl">{p.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                {p.name}
                {p.preset_id != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">
                    📅 {t('settings.periodsManager.presetBadge')}
                  </span>
                )}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">{formatDateRange(p.start_date, p.end_date)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{childFilterLabel(p.child_filter)}</div>
            </div>
            <button
              onClick={() => openEdit(p)}
              className="text-gray-500 hover:text-amber-400 transition-colors p-1 text-sm"
              title={t('common.edit')}
            >✏️</button>
            <button
              onClick={() => handleDelete(p.id)}
              className="text-gray-500 hover:text-red-400 transition-colors p-1 text-sm"
              title={t('settings.periodsManager.deleteConfirm')}
            >🗑</button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-700/40 border border-gray-600 rounded-xl p-4 mb-4">
          <div className="font-bold text-white mb-4">{editingId ? t('common.edit') : t('settings.periodsManager.addPeriod')}</div>

          <div className="mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{t('settings.periodsManager.name')}</label>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500"
              placeholder={t('settings.periodsManager.name')}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{t('settings.periodsManager.start')}</label>
              <input type="date" className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{t('settings.periodsManager.end')}</label>
              <input type="date" className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{t('settings.categoryManager.emoji')}</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border-2 transition-all ${emoji === e ? 'border-amber-500 bg-amber-500/15' : 'border-gray-600 bg-gray-800'}`}
                >{e}</button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{t('settings.periodsManager.type')}</label>
            <div className="flex bg-gray-800 rounded-lg p-1 gap-1 border border-gray-600 flex-wrap">
              {[{ val: 'all', label: 'All children' }, ...children.map(c => ({ val: c.id, label: c.name }))].map(opt => (
                <button key={opt.val} onClick={() => setChildFilter(opt.val)}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all min-w-[60px] ${childFilter === opt.val ? 'bg-amber-500 text-black' : 'text-gray-400'}`}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {saveError && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm mb-3">
              {saveError}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors">
              {saving ? '...' : t('settings.periodsManager.save')}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2.5 bg-gray-700 text-gray-400 text-sm font-medium rounded-lg">
              {t('settings.periodsManager.cancel')}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          {/* Region preset picker */}
          <div className="mb-4 bg-gray-700/40 border border-gray-600 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              {t('settings.periodsManager.presetPicker.title')}
            </div>
            <div className="text-gray-500 text-xs mb-3">
              {t('settings.periodsManager.presetPicker.hint')}
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500"
                value={selectedPresetId}
                onChange={e => { setSelectedPresetId(e.target.value); setApplyStatus('') }}
              >
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>
              <button
                onClick={handleApplyPreset}
                disabled={!selectedPresetId || applyingPreset}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                {applyingPreset ? '...' : t('settings.periodsManager.presetPicker.apply')}
              </button>
            </div>
            {applyStatus && (
              <div className="text-amber-400 text-xs mt-2">{applyStatus}</div>
            )}
          </div>

          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-amber-500 hover:text-amber-500 text-gray-500 font-bold text-sm rounded-xl transition-all">
            + {t('settings.periodsManager.addPeriod')}
          </button>
        </>
      )}
    </div>
  )
}
