'use client'

import { useState, useEffect } from 'react'
import {
  getSubjects,
  createSubject,
  toggleSubjectActive,
  archiveSubject,
} from '@/lib/repositories/schedule.repo'
import type { Subject } from '@/lib/models/flexible.types'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'

interface Props {
  children: { id: string; name: string }[]
}

export default function SubjectsManager({ children }: Props) {
  const t = useT()
  const [childId, setChildId] = useState(children[0]?.id ?? '')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId])

  async function load() {
    setLoading(true)
    try {
      const data = await getSubjects(childId)
      setSubjects(data)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setError('')
    try {
      const created = await createSubject(childId, name)
      setSubjects(prev => [...prev, created])
      setNewName('')
    } catch {
      setError(t('common.error'))
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(subject: Subject) {
    try {
      await toggleSubjectActive(subject.id, !subject.active)
      setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, active: !s.active } : s))
    } catch {
      setError(t('common.error'))
    }
  }

  async function handleArchive(id: string) {
    if (!confirm(t('settings.subjectsManager.deleteConfirm'))) return
    try {
      await archiveSubject(id)
      setSubjects(prev => prev.filter(s => s.id !== id))
    } catch {
      setError(t('common.error'))
    }
  }

  const active = subjects.filter(s => !s.archived && s.active)
  const inactive = subjects.filter(s => !s.archived && !s.active)

  return (
    <div>
      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 mb-5">
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => setChildId(c.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: childId === c.id ? T.indigo : T.card,
                color: childId === c.id ? T.text : T.muted,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Add subject */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={t('settings.subjectsManager.name')}
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: T.card, color: T.text, border: `1px solid ${T.cardBorder}` }}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          style={{ background: T.indigo, color: T.text }}
        >
          {adding ? '...' : t('settings.subjectsManager.addSubject')}
        </button>
      </div>

      {error && <p className="text-sm mb-3" style={{ color: T.danger }}>{error}</p>}

      {loading && <p className="text-sm py-4 text-center" style={{ color: T.muted }}>{t('common.loading')}</p>}

      {!loading && subjects.length === 0 && (
        <p className="text-sm py-4 text-center" style={{ color: T.muted }}>
          {t('settings.subjectsManager.addSubject')}
        </p>
      )}

      {/* Active subjects */}
      {active.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: T.muted }}>{t('settings.categoryManager.active')}</p>
          <div className="space-y-1">
            {active.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 px-3 rounded-lg group" style={{ background: T.cardHi }}>
                <span className="flex-1 text-sm" style={{ color: T.text }}>{s.name}</span>
                <button
                  onClick={() => handleToggle(s)}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2"
                  style={{ color: T.warning }}
                >
                  {t('settings.categoryManager.inactive')}
                </button>
                <button
                  onClick={() => handleArchive(s.id)}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2"
                  style={{ color: T.danger }}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive subjects */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: T.muted }}>{t('settings.categoryManager.inactive')}</p>
          <div className="space-y-1">
            {inactive.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 px-3 rounded-lg group opacity-60" style={{ background: T.card }}>
                <span className="flex-1 text-sm" style={{ color: T.muted }}>{s.name}</span>
                <button
                  onClick={() => handleToggle(s)}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2"
                  style={{ color: T.success }}
                >
                  {t('settings.categoryManager.active')}
                </button>
                <button
                  onClick={() => handleArchive(s.id)}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2"
                  style={{ color: T.danger }}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
