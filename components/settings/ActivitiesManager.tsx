'use client'

import { useState, useEffect } from 'react'
import {
  getExtraActivities,
  addExtraActivity,
  updateExtraActivity,
  deleteExtraActivity,
  ExtraActivity,
} from '@/lib/expenses-api'
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'

const EMOJIS = ['📖', '✏️', '🧮', '🔬', '🌍', '🎨', '🎵', '💻', '♟️', '🏃', '🤸', '🧩', '📝', '🌱', '🍳', '🔧']

const COINS_OPTIONS = [1, 2, 3, 5, 7, 10]

type DayTypeTab = 'vacation' | 'weekend'

interface ActivityForm {
  name: string
  emoji: string
  dayTypes: string[]
  coins: number
}

const EMPTY_FORM: ActivityForm = {
  name: '',
  emoji: '📖',
  dayTypes: ['vacation', 'weekend'],
  coins: 3,
}

export default function ActivitiesManager() {
  const { members } = useFamilyMembers()
  const children = members.filter(m => m.role === 'child')
  const [childId, setChildId] = useState('')
  const [tab, setTab] = useState<DayTypeTab>('vacation')

  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id)
  }, [children, childId])
  const [activities, setActivities] = useState<ExtraActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadActivities() }, [childId])

  async function loadActivities() {
    setLoading(true)
    try {
      const data = await getExtraActivities(childId)
      setActivities(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = activities.filter(a => a.day_types.includes(tab))

  function openAdd() {
    setForm({ ...EMPTY_FORM, dayTypes: [tab] })
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(a: ExtraActivity) {
    setForm({ name: a.name, emoji: a.emoji, dayTypes: a.day_types, coins: a.coins })
    setEditingId(a.id)
    setShowForm(true)
    setError('')
  }

  function toggleDayType(dt: string) {
    setForm(prev => ({
      ...prev,
      dayTypes: prev.dayTypes.includes(dt)
        ? prev.dayTypes.filter(d => d !== dt)
        : [...prev.dayTypes, dt],
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Введите название занятия'); return }
    if (form.dayTypes.length === 0) { setError('Выберите хотя бы один тип дня'); return }
    setSaving(true); setError('')
    try {
      if (editingId) {
        await updateExtraActivity(editingId, {
          name: form.name.trim(),
          emoji: form.emoji,
          dayTypes: form.dayTypes,
          coins: form.coins,
        })
      } else {
        await addExtraActivity({
          childId,
          name: form.name.trim(),
          emoji: form.emoji,
          dayTypes: form.dayTypes,
          coins: form.coins,
        })
      }
      setShowForm(false)
      setEditingId(null)
      await loadActivities()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(a: ExtraActivity) {
    if (!confirm(`Удалить "${a.name}"?`)) return
    try {
      await deleteExtraActivity(a.id)
      await loadActivities()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function moveUp(a: ExtraActivity) {
    const list = [...filtered]
    const idx = list.findIndex(x => x.id === a.id)
    if (idx <= 0) return
    const prev = list[idx - 1]
    await Promise.all([
      updateExtraActivity(a.id, { sortOrder: prev.sort_order }),
      updateExtraActivity(prev.id, { sortOrder: a.sort_order }),
    ])
    await loadActivities()
  }

  async function moveDown(a: ExtraActivity) {
    const list = [...filtered]
    const idx = list.findIndex(x => x.id === a.id)
    if (idx >= list.length - 1) return
    const next = list[idx + 1]
    await Promise.all([
      updateExtraActivity(a.id, { sortOrder: next.sort_order }),
      updateExtraActivity(next.id, { sortOrder: a.sort_order }),
    ])
    await loadActivities()
  }

  const dayTypeLabel = (dt: string) => dt === 'vacation' ? '🌴 Каникулы' : '📅 Выходные'

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>📋 Доп. занятия</div>
        <div style={{ fontSize: '13px', color: 'rgba(238,238,255,0.5)' }}>
          Настройте список занятий для каждого ребёнка. В модалке дня будет готовый чеклист.
        </div>
      </div>

      {/* Child selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {children.map(c => (
          <button
            key={c.id}
            onClick={() => { setChildId(c.id); setShowForm(false) }}
            style={{
              flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800,
              borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
              borderColor: childId === c.id ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)',
              background: childId === c.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
              color: childId === c.id ? '#F59E0B' : 'rgba(238,238,255,0.5)',
            }}
          >
            {c.display_name}
          </button>
        ))}
      </div>

      {/* Day type tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {(['vacation', 'weekend'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false) }}
            style={{
              flex: 1, padding: '8px', fontSize: '13px', fontWeight: 800,
              borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
              borderColor: tab === t ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
              background: tab === t ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              color: tab === t ? '#F59E0B' : 'rgba(238,238,255,0.4)',
            }}
          >
            {dayTypeLabel(t)}
          </button>
        ))}
        <button
          onClick={openAdd}
          style={{
            padding: '8px 14px', fontSize: '12px', fontWeight: 800,
            borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'rgba(245,158,11,0.7)', color: '#000',
          }}
        >
          + Добавить
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', color: '#F43F5E', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#F59E0B', marginBottom: '12px' }}>
            {editingId ? '✏️ Редактировать занятие' : '➕ Новое занятие'}
          </div>

          {/* Emoji picker */}
          <div style={{ marginBottom: '12px' }}>
            <div className="premium-label">Иконка</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setForm(p => ({ ...p, emoji: e }))}
                  style={{
                    width: '36px', height: '36px', fontSize: '18px',
                    borderRadius: '8px', border: '1.5px solid', cursor: 'pointer',
                    borderColor: form.emoji === e ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)',
                    background: form.emoji === e ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div className="premium-label">Название занятия *</div>
            <input className="premium-input" placeholder="Математика, Английский, Шахматы..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          {/* Day types */}
          <div style={{ marginBottom: '12px' }}>
            <div className="premium-label">Показывать в дни</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {(['vacation', 'weekend'] as const).map(dt => (
                <button
                  key={dt}
                  onClick={() => toggleDayType(dt)}
                  style={{
                    flex: 1, padding: '8px', fontSize: '12px', fontWeight: 800,
                    borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                    borderColor: form.dayTypes.includes(dt) ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
                    background: form.dayTypes.includes(dt) ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                    color: form.dayTypes.includes(dt) ? '#F59E0B' : 'rgba(238,238,255,0.4)',
                  }}
                >
                  {dayTypeLabel(dt)}
                </button>
              ))}
            </div>
          </div>

          {/* Coins */}
          <div style={{ marginBottom: '14px' }}>
            <div className="premium-label">Монеты за выполнение</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {COINS_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(p => ({ ...p, coins: c }))}
                  style={{
                    flex: 1, padding: '8px 4px', fontSize: '12px', fontWeight: 800,
                    borderRadius: '8px', border: '1.5px solid', cursor: 'pointer',
                    borderColor: form.coins === c ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)',
                    background: form.coins === c ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                    color: form.coins === c ? '#10B981' : 'rgba(238,238,255,0.4)',
                  }}
                >
                  +{c}💰
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(245,158,11,0.8)', color: '#000' }}
            >
              {saving ? 'Сохранение...' : '💾 Сохранить'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setError('') }}
              style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', color: 'rgba(238,238,255,0.5)' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Activity list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(238,238,255,0.4)', fontSize: '13px' }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(238,238,255,0.3)', fontSize: '13px' }}>
          Нет занятий для этого типа дня. Нажмите «+ Добавить».
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map((a, idx) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
              }}
            >
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{a.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{a.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(238,238,255,0.4)', marginTop: '2px' }}>
                  {a.day_types.map(dayTypeLabel).join(' · ')}
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>
                +{a.coins}💰
              </span>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => moveUp(a)} disabled={idx === 0} style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', color: 'rgba(238,238,255,0.4)', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => moveDown(a)} disabled={idx === filtered.length - 1} style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', color: 'rgba(238,238,255,0.4)', opacity: idx === filtered.length - 1 ? 0.3 : 1 }}>↓</button>
                <button onClick={() => openEdit(a)} style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', color: 'rgba(238,238,255,0.5)' }}>✏️</button>
                <button onClick={() => handleDelete(a)} style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer', background: 'rgba(244,63,94,0.06)', color: '#F43F5E' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
