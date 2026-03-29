'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getAllSections,
  addSection,
  updateSection,
  deleteSection,
  Section,
} from '@/lib/expenses-api'

// Children in this family
const CHILDREN = [
  { id: 'adam', name: 'Адам' },
  { id: 'alim', name: 'Алим' },
]

const DAYS = [
  { key: 'mon', label: 'Пн' },
  { key: 'tue', label: 'Вт' },
  { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' },
  { key: 'fri', label: 'Пт' },
  { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
]

interface SectionForm {
  name: string
  trainer: string
  address: string
  cost: string
  startDate: string
  endDate: string
  scheduleDays: string[]
}

const EMPTY_FORM: SectionForm = {
  name: '',
  trainer: '',
  address: '',
  cost: '',
  startDate: '',
  endDate: '',
  scheduleDays: [],
}

export default function SectionsManager() {
  const [childId, setChildId] = useState('adam')
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SectionForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'active' | 'archive'>('active')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadSections() }, [childId])

  async function loadSections() {
    setLoading(true)
    try {
      const data = await getAllSections(childId)
      setSections(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function isArchived(s: Section): boolean {
    return !!s.end_date && s.end_date < today
  }

  const activeSections = sections.filter(s => s.is_active && !isArchived(s))
  const archivedSections = sections.filter(s => !s.is_active || isArchived(s))

  function openAdd() {
    setForm({ ...EMPTY_FORM, startDate: today })
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(s: Section) {
    setForm({
      name: s.name,
      trainer: s.trainer || '',
      address: s.address || '',
      cost: s.cost ? String(s.cost) : '',
      startDate: s.start_date || '',
      endDate: s.end_date || '',
      scheduleDays: s.schedule_days || [],
    })
    setEditingId(s.id)
    setShowForm(true)
    setError('')
  }

  function toggleScheduleDay(day: string) {
    setForm(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day],
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Введите название секции'); return }
    setSaving(true); setError('')
    try {
      if (editingId) {
        await updateSection(editingId, {
          name: form.name.trim(),
          trainer: form.trainer.trim() || undefined,
          address: form.address.trim() || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          scheduleDays: form.scheduleDays,
        })
      } else {
        await addSection({
          childId,
          name: form.name.trim(),
          trainer: form.trainer.trim() || undefined,
          address: form.address.trim() || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          scheduleDays: form.scheduleDays,
        })
      }
      setShowForm(false)
      setEditingId(null)
      await loadSections()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(s: Section) {
    if (!confirm(`Завершить секцию "${s.name}"? Она попадёт в архив, история останется.`)) return
    try {
      await updateSection(s.id, { endDate: today, isActive: true })
      await loadSections()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(s: Section) {
    if (!confirm(`Удалить "${s.name}" полностью? Это нельзя отменить.`)) return
    try {
      await deleteSection(s.id)
      await loadSections()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function formatDateRange(s: Section): string {
    const from = s.start_date ? new Date(s.start_date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : null
    const to = s.end_date ? new Date(s.end_date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'
    if (!from && !s.end_date) return ''
    if (!from) return `до ${to}`
    return `${from} — ${to}`
  }

  const displayed = tab === 'active' ? activeSections : archivedSections

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>⚽ Секции и тренировки</div>
        <div style={{ fontSize: '13px', color: 'rgba(238,238,255,0.5)' }}>
          Управляйте спортивными секциями. Укажите даты — и старые секции уйдут в архив автоматически.
        </div>
      </div>

      {/* Child selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {CHILDREN.map(c => (
          <button
            key={c.id}
            onClick={() => { setChildId(c.id); setShowForm(false) }}
            style={{
              flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800,
              borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
              borderColor: childId === c.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
              background: childId === c.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
              color: childId === c.id ? '#818CF8' : 'rgba(238,238,255,0.5)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {(['active', 'archive'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 800,
              borderRadius: '8px', border: '1px solid', cursor: 'pointer',
              borderColor: tab === t ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
              background: tab === t ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
              color: tab === t ? '#818CF8' : 'rgba(238,238,255,0.4)',
            }}
          >
            {t === 'active' ? `Текущие (${activeSections.length})` : `Архив (${archivedSections.length})`}
          </button>
        ))}
        <button
          onClick={openAdd}
          style={{
            marginLeft: 'auto', padding: '6px 14px', fontSize: '12px', fontWeight: 800,
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: 'rgba(99,102,241,0.8)', color: '#fff',
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
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#818CF8', marginBottom: '12px' }}>
            {editingId ? '✏️ Редактировать секцию' : '➕ Новая секция'}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div className="premium-label">Название *</div>
            <input className="premium-input" placeholder="Плавание, Карате, Футбол..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <div className="premium-label">Тренер</div>
              <input className="premium-input" placeholder="Имя тренера" value={form.trainer} onChange={e => setForm(p => ({ ...p, trainer: e.target.value }))} />
            </div>
            <div>
              <div className="premium-label">Стоимость / мес.</div>
              <input className="premium-input" type="number" placeholder="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div className="premium-label">Адрес / место</div>
            <input className="premium-input" placeholder="Ул. Примерная 1" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <div className="premium-label">Дата начала</div>
              <input className="premium-input" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <div className="premium-label">Дата окончания</div>
              <input className="premium-input" type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div className="premium-label">Дни занятий (необязательно — если не выбрано, секция показывается каждый день)</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {DAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleScheduleDay(d.key)}
                  style={{
                    padding: '6px 10px', fontSize: '12px', fontWeight: 800,
                    borderRadius: '8px', border: '1px solid', cursor: 'pointer',
                    borderColor: form.scheduleDays.includes(d.key) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
                    background: form.scheduleDays.includes(d.key) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                    color: form.scheduleDays.includes(d.key) ? '#818CF8' : 'rgba(238,238,255,0.4)',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.8)', color: '#fff' }}
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

      {/* Section list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(238,238,255,0.4)', fontSize: '13px' }}>Загрузка...</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(238,238,255,0.3)', fontSize: '13px' }}>
          {tab === 'active' ? 'Нет активных секций. Нажмите «+ Добавить».' : 'Архив пуст.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayed.map(s => (
            <div
              key={s.id}
              style={{
                padding: '12px 14px',
                background: isArchived(s) ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isArchived(s) ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                opacity: isArchived(s) ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{s.name}</div>
                  {(s.trainer || s.address) && (
                    <div style={{ fontSize: '12px', color: 'rgba(238,238,255,0.45)', marginTop: '2px' }}>
                      {[s.trainer, s.address].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {formatDateRange(s) && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isArchived(s) ? 'rgba(238,238,255,0.3)' : 'rgba(129,140,248,0.9)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', padding: '2px 7px', borderRadius: '6px' }}>
                        📅 {formatDateRange(s)}
                      </span>
                    )}
                    {s.schedule_days && s.schedule_days.length > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(238,238,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: '6px' }}>
                        {s.schedule_days.map(d => DAYS.find(x => x.key === d)?.label).filter(Boolean).join(', ')}
                      </span>
                    )}
                    {s.cost && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(238,238,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: '6px' }}>
                        💳 {s.cost} ₽/мес
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {!isArchived(s) && (
                    <>
                      <button
                        onClick={() => openEdit(s)}
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(238,238,255,0.6)' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleArchive(s)}
                        title="Завершить (в архив)"
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', background: 'rgba(245,158,11,0.06)', color: '#F59E0B' }}
                      >
                        📦
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(s)}
                    style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer', background: 'rgba(244,63,94,0.06)', color: '#F43F5E' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
