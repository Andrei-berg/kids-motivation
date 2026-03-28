'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { getVacationPeriods, createVacationPeriod, updateVacationPeriod, deleteVacationPeriod, VacationPeriod } from '@/lib/vacation-api'

const EMOJIS = ['🌸', '🌴', '❄️', '🍂', '🎄', '☀️', '🌊', '⛷️']

// Стандартные каникулы 2025–2026 учебного года (РФ, типовые даты)
const PRESETS = [
  { name: 'Осенние каникулы',  emoji: '🍂', start: '2025-10-27', end: '2025-11-02' },
  { name: 'Зимние каникулы',   emoji: '❄️', start: '2025-12-29', end: '2026-01-09' },
  { name: 'Весенние каникулы', emoji: '🌸', start: '2026-03-23', end: '2026-03-29' },
  { name: 'Летние каникулы',   emoji: '☀️', start: '2026-06-01', end: '2026-08-31' },
]

interface ChildOption {
  id: string
  name: string
}

export default function PeriodsManager() {
  const { familyId } = useAppStore()
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

  useEffect(() => { if (familyId) loadData(familyId) }, [familyId])

  async function loadData(fid: string) {
    try {
      const supabase = createClient()

      const { data: childRows } = await supabase
        .from('family_members')
        .select('id, display_name')
        .eq('family_id', fid)
        .eq('role', 'child')
        .order('created_at')

      setChildren((childRows || []).map(c => ({
        id: c.id,
        name: c.display_name || 'Ребёнок',
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
    if (!familyId) { setSaveError('Семья не найдена — перезагрузите страницу'); return }
    if (!name.trim()) { setSaveError('Введите название'); return }
    if (!startDate || !endDate) { setSaveError('Укажите даты начала и окончания'); return }
    if (startDate > endDate) { setSaveError('Дата начала не может быть позже даты окончания'); return }
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
      setSaveError(e instanceof Error ? e.message : 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить период?')) return
    await deleteVacationPeriod(id)
    setPeriods(periods.filter(p => p.id !== id))
  }

  function formatDateRange(start: string, end: string) {
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    const days = Math.floor((new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86400000) + 1
    return `${fmt(start)} – ${fmt(end)} · ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`
  }

  function childFilterLabel(filter: string) {
    if (filter === 'all') return 'Все дети'
    const child = children.find(c => c.id === filter)
    return child ? child.name : filter
  }

  if (loading) return <div className="text-gray-400 text-sm">Загрузка...</div>

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        В эти периоды система автоматически переключится на режим каникул: чтение, доп. уроки, помощь по дому вместо оценок.
      </p>

      {/* Rules reminder */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 mb-5 text-sm">
        <div className="font-bold text-amber-400 mb-2">📋 Правила каникул</div>
        <div className="text-gray-400 space-y-1">
          <div>📚 Чтение ≥15 мин или ≥10 стр → <span className="text-amber-400 font-bold">+3💰</span></div>
          <div>📚 Чтение ≥30 мин или ≥20 стр → <span className="text-amber-400 font-bold">+5💰</span></div>
          <div>📚 Книга дочитана → <span className="text-amber-400 font-bold">+10💰</span></div>
          <div>📖 Каждый доп. урок → <span className="text-amber-400 font-bold">+3💰</span></div>
          <div>🏠 Помощь по дому → <span className="text-amber-400 font-bold">+3💰</span></div>
        </div>
      </div>

      {/* Period list */}
      <div className="space-y-3 mb-4">
        {periods.length === 0 && !showForm && (
          <div className="text-gray-500 text-sm text-center py-6 border border-gray-700 rounded-xl border-dashed">
            Нет периодов — добавьте первый
          </div>
        )}
        {periods.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            <div className="text-2xl">{p.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm">{p.name}</div>
              <div className="text-gray-400 text-xs mt-0.5">{formatDateRange(p.start_date, p.end_date)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{childFilterLabel(p.child_filter)}</div>
            </div>
            <button
              onClick={() => openEdit(p)}
              className="text-gray-500 hover:text-amber-400 transition-colors p-1 text-sm"
              title="Редактировать"
            >✏️</button>
            <button
              onClick={() => handleDelete(p.id)}
              className="text-gray-500 hover:text-red-400 transition-colors p-1 text-sm"
              title="Удалить"
            >🗑</button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-700/40 border border-gray-600 rounded-xl p-4 mb-4">
          <div className="font-bold text-white mb-4">{editingId ? 'Редактировать период' : 'Новый период'}</div>

          <div className="mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Название</label>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500"
              placeholder="Весенние каникулы"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Начало</label>
              <input type="date" className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Конец</label>
              <input type="date" className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-amber-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Иконка</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border-2 transition-all ${emoji === e ? 'border-amber-500 bg-amber-500/15' : 'border-gray-600 bg-gray-800'}`}
                >{e}</button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Применить к</label>
            <div className="flex bg-gray-800 rounded-lg p-1 gap-1 border border-gray-600 flex-wrap">
              {[{ val: 'all', label: 'Все дети' }, ...children.map(c => ({ val: c.id, label: c.name }))].map(opt => (
                <button key={opt.val} onClick={() => setChildFilter(opt.val)}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all min-w-[60px] ${childFilter === opt.val ? 'bg-amber-500 text-black' : 'text-gray-400'}`}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {saveError && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm mb-3">
              ⚠️ {saveError}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2.5 bg-gray-700 text-gray-400 text-sm font-medium rounded-lg">
              Отмена
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <>
          {/* Быстрые шаблоны */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Шаблоны 2025–2026
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => {
                const alreadyAdded = periods.some(
                  existing => existing.name === p.name && existing.start_date === p.start
                )
                const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                return (
                  <button
                    key={p.name}
                    disabled={alreadyAdded}
                    onClick={() => {
                      setName(p.name)
                      setEmoji(p.emoji)
                      setStartDate(p.start)
                      setEndDate(p.end)
                      setChildFilter('all')
                      setShowForm(true)
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      alreadyAdded
                        ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                        : 'border-gray-600 bg-gray-700/40 hover:border-amber-500/60 hover:bg-amber-500/8 cursor-pointer'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{p.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{fmt(p.start)} – {fmt(p.end)}</div>
                    </div>
                    {alreadyAdded && <span className="text-green-500 text-xs ml-auto flex-shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-amber-500 hover:text-amber-500 text-gray-500 font-bold text-sm rounded-xl transition-all">
            + Добавить свой период
          </button>
        </>
      )}
    </div>
  )
}
