'use client'

import { useState, useEffect } from 'react'
import {
  getSubjects,
  createSubject,
  toggleSubjectActive,
  archiveSubject,
} from '@/lib/repositories/schedule.repo'
import type { Subject } from '@/lib/models/flexible.types'

interface Props {
  children: { id: string; name: string }[]
}

export default function SubjectsManager({ children }: Props) {
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
      setError('Не удалось загрузить предметы')
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
      setError('Ошибка при добавлении')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(subject: Subject) {
    try {
      await toggleSubjectActive(subject.id, !subject.active)
      setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, active: !s.active } : s))
    } catch {
      setError('Ошибка при изменении')
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Архивировать предмет? Он исчезнет из дневника.')) return
    try {
      await archiveSubject(id)
      setSubjects(prev => prev.filter(s => s.id !== id))
    } catch {
      setError('Ошибка при архивировании')
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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                childId === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
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
          placeholder="Название предмета (напр. Математика)"
          className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          {adding ? '...' : 'Добавить'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading && <p className="text-gray-500 text-sm py-4 text-center">Загрузка...</p>}

      {!loading && subjects.length === 0 && (
        <p className="text-gray-500 text-sm py-4 text-center">
          Нет предметов. Добавьте первый предмет выше.
        </p>
      )}

      {/* Active subjects */}
      {active.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Активные</p>
          <div className="space-y-1">
            {active.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 px-3 bg-gray-750 rounded-lg group">
                <span className="flex-1 text-sm text-gray-200">{s.name}</span>
                <button
                  onClick={() => handleToggle(s)}
                  className="text-xs text-yellow-400 hover:text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                >
                  Выключить
                </button>
                <button
                  onClick={() => handleArchive(s.id)}
                  className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive subjects */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Выключены</p>
          <div className="space-y-1">
            {inactive.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 px-3 bg-gray-800 rounded-lg group opacity-60">
                <span className="flex-1 text-sm text-gray-400">{s.name}</span>
                <button
                  onClick={() => handleToggle(s)}
                  className="text-xs text-green-400 hover:text-green-300 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                >
                  Включить
                </button>
                <button
                  onClick={() => handleArchive(s.id)}
                  className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
