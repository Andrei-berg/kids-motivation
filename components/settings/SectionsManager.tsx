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
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'
import { useT } from '@/lib/i18n'
import { localDateString } from '@/utils/helpers'
import { T } from '@/components/parent-center/tokens'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
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
  const t = useT()
  const { members } = useFamilyMembers()
  const { familyId } = useAppStore()
  const children = members.filter(m => m.role === 'child')
  const [childId, setChildId] = useState('')

  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id)
  }, [children, childId])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SectionForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'active' | 'archive'>('active')

  const today = localDateString()

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
    if (!form.name.trim()) { setError(t('settings.sectionsManager.name')); return }
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
          familyId: familyId ?? undefined,
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
    if (!confirm(`${t('settings.sectionsManager.name')}: "${s.name}"?`)) return
    try {
      await updateSection(s.id, { endDate: today, isActive: true })
      await loadSections()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(s: Section) {
    if (!confirm(t('settings.sectionsManager.deleteConfirm'))) return
    try {
      await deleteSection(s.id)
      await loadSections()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function formatDateRange(s: Section): string {
    const from = s.start_date ? new Date(s.start_date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : null
    const to = s.end_date ? new Date(s.end_date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'
    if (!from && !s.end_date) return ''
    if (!from) return `to ${to}`
    return `${from} — ${to}`
  }

  const displayed = tab === 'active' ? activeSections : archivedSections

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: T.text, marginBottom: '4px' }}>⚽ {t('settings.sectionsManager.title')}</div>
        <div style={{ fontSize: '13px', color: T.textDim }}>
          {t('settings.sectionsManager.addSection')}
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
              borderColor: childId === c.id ? `${T.indigo}80` : T.cardBorderHi,
              background: childId === c.id ? T.indigoSoft : T.card,
              color: childId === c.id ? T.indigoHi : T.textDim,
            }}
          >
            {c.display_name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {(['active', 'archive'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 800,
              borderRadius: '8px', border: '1px solid', cursor: 'pointer',
              borderColor: tab === tabKey ? `${T.indigo}66` : T.cardBorderHi,
              background: tab === tabKey ? T.indigoSoft : T.card,
              color: tab === tabKey ? T.indigoHi : T.muted,
            }}
          >
            {tabKey === 'active' ? `Active (${activeSections.length})` : `Archive (${archivedSections.length})`}
          </button>
        ))}
        <button
          onClick={openAdd}
          style={{
            marginLeft: 'auto', padding: '6px 14px', fontSize: '12px', fontWeight: 800,
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: T.indigo, color: T.text,
          }}
        >
          + {t('settings.sectionsManager.addSection')}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: '8px', color: T.danger, fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ background: T.indigoSoft, border: `1px solid ${T.cardBorderHi}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: T.indigoHi, marginBottom: '12px' }}>
            {editingId ? `✏️ ${t('common.edit')}` : `➕ ${t('settings.sectionsManager.addSection')}`}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div className="premium-label">{t('settings.sectionsManager.name')} *</div>
            <input className="premium-input" placeholder={t('settings.sectionsManager.name')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <div className="premium-label">Trainer</div>
              <input className="premium-input" placeholder="Trainer name" value={form.trainer} onChange={e => setForm(p => ({ ...p, trainer: e.target.value }))} />
            </div>
            <div>
              <div className="premium-label">Cost / mo.</div>
              <input className="premium-input" type="number" placeholder="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <div className="premium-label">Address / location</div>
            <input className="premium-input" placeholder="Location" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <div className="premium-label">{t('settings.periodsManager.start')}</div>
              <input className="premium-input" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <div className="premium-label">{t('settings.periodsManager.end')}</div>
              <input className="premium-input" type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div className="premium-label">Schedule days (optional)</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {DAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleScheduleDay(d.key)}
                  style={{
                    padding: '6px 10px', fontSize: '12px', fontWeight: 800,
                    borderRadius: '8px', border: '1px solid', cursor: 'pointer',
                    borderColor: form.scheduleDays.includes(d.key) ? `${T.indigo}80` : T.cardBorderHi,
                    background: form.scheduleDays.includes(d.key) ? T.indigoSoft : T.card,
                    color: form.scheduleDays.includes(d.key) ? T.indigoHi : T.muted,
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
              style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', border: 'none', cursor: 'pointer', background: T.indigo, color: T.text }}
            >
              {saving ? '...' : `💾 ${t('settings.sectionsManager.save')}`}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setError('') }}
              style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 800, borderRadius: '10px', border: `1px solid ${T.cardBorderHi}`, cursor: 'pointer', background: T.card, color: T.muted }}
            >
              {t('settings.sectionsManager.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Section list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: T.muted, fontSize: '13px' }}>{t('common.loading')}</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: T.faint, fontSize: '13px' }}>
          {tab === 'active' ? t('settings.sectionsManager.addSection') : 'Archive is empty.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayed.map(s => (
            <div
              key={s.id}
              style={{
                padding: '12px 14px',
                background: isArchived(s) ? T.card : T.cardHi,
                border: `1px solid ${isArchived(s) ? T.cardBorder : T.cardBorderHi}`,
                borderRadius: '10px',
                opacity: isArchived(s) ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: T.text }}>{s.name}</div>
                  {(s.trainer || s.address) && (
                    <div style={{ fontSize: '12px', color: T.textDim, marginTop: '2px' }}>
                      {[s.trainer, s.address].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {formatDateRange(s) && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isArchived(s) ? T.faint : T.indigoHi, background: T.indigoSoft, border: `1px solid ${T.cardBorderHi}`, padding: '2px 7px', borderRadius: '6px' }}>
                        📅 {formatDateRange(s)}
                      </span>
                    )}
                    {s.schedule_days && s.schedule_days.length > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, background: T.card, border: `1px solid ${T.cardBorder}`, padding: '2px 7px', borderRadius: '6px' }}>
                        {s.schedule_days.map(d => DAYS.find(x => x.key === d)?.label).filter(Boolean).join(', ')}
                      </span>
                    )}
                    {s.cost && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: T.textDim, background: T.card, border: `1px solid ${T.cardBorder}`, padding: '2px 7px', borderRadius: '6px' }}>
                        💳 {s.cost}/mo
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {!isArchived(s) && (
                    <>
                      <button
                        onClick={() => openEdit(s)}
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: `1px solid ${T.cardBorderHi}`, cursor: 'pointer', background: T.card, color: T.textDim }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleArchive(s)}
                        title="Archive"
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: `1px solid ${T.warning}33`, cursor: 'pointer', background: T.warningSoft, color: T.warning }}
                      >
                        📦
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(s)}
                    style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: `1px solid ${T.danger}33`, cursor: 'pointer', background: T.dangerSoft, color: T.danger }}
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
