'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFamilyChildren } from '@/lib/onboarding-api'
import type { ChildProfile } from '@/lib/onboarding-api'
import {
  getScheduleItems,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
} from '@/lib/schedule-api'
import type { ScheduleItem } from '@/lib/schedule-api'

const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] // index 1-7

const TYPE_OPTIONS = [
  { value: 'lesson', label: 'Урок' },
  { value: 'section', label: 'Секция' },
  { value: 'routine', label: 'Распорядок' },
] as const

type ItemType = 'lesson' | 'section' | 'routine'

const TYPE_LABELS: Record<ItemType, string> = {
  lesson: 'Уроки',
  section: 'Секции',
  routine: 'Распорядок',
}

const TYPE_COLORS: Record<ItemType, string> = {
  lesson: 'bg-blue-500/20 text-blue-400',
  section: 'bg-orange-500/20 text-orange-400',
  routine: 'bg-purple-500/20 text-purple-400',
}

interface FormData {
  type: ItemType
  title: string
  day_of_week: number[]
  start_time: string
  end_time: string
  location: string
  has_reminder: boolean
  reminder_offset: number
}

const DEFAULT_FORM: FormData = {
  type: 'lesson',
  title: '',
  day_of_week: [],
  start_time: '',
  end_time: '',
  location: '',
  has_reminder: false,
  reminder_offset: 15,
}

interface Props {
  familyId: string
}

export default function ScheduleEditor({ familyId }: Props) {
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load all children (including linked)
  useEffect(() => {
    const load = async () => {
      setLoadingChildren(true)
      try {
        const data = await getFamilyChildren(familyId)
        setChildren(data)
        if (data.length > 0) setSelectedChildId(data[0].memberId)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки детей'
        setError(msg)
      } finally {
        setLoadingChildren(false)
      }
    }
    load()
  }, [familyId])

  const loadItems = useCallback(async () => {
    if (!selectedChildId) return
    setLoadingItems(true)
    setError(null)
    try {
      const data = await getScheduleItems(familyId, selectedChildId)
      setItems(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки расписания'
      setError(msg)
    } finally {
      setLoadingItems(false)
    }
  }, [familyId, selectedChildId])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      day_of_week: prev.day_of_week.includes(day)
        ? prev.day_of_week.filter(d => d !== day)
        : [...prev.day_of_week, day].sort((a, b) => a - b),
    }))
  }

  const openAddForm = () => {
    setEditingItemId(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
    setShowAddForm(true)
  }

  const openEditForm = (item: ScheduleItem) => {
    setShowAddForm(false)
    setEditingItemId(item.id)
    setForm({
      type: item.type,
      title: item.title,
      day_of_week: item.day_of_week,
      start_time: item.start_time ?? '',
      end_time: item.end_time ?? '',
      location: item.location ?? '',
      has_reminder: item.has_reminder,
      reminder_offset: item.reminder_offset,
    })
    setFormError(null)
  }

  const closeForm = () => {
    setShowAddForm(false)
    setEditingItemId(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Введите название')
      return
    }
    if (form.day_of_week.length === 0) {
      setFormError('Выберите хотя бы один день недели')
      return
    }
    if (!selectedChildId) return

    setSaving(true)
    setFormError(null)
    try {
      const fields = {
        type: form.type,
        title: form.title.trim(),
        day_of_week: form.day_of_week,
        start_time: form.start_time || null,
        end_time: form.type === 'section' ? (form.end_time || null) : null,
        location: form.type === 'section' ? (form.location.trim() || null) : null,
        has_reminder: form.has_reminder,
        reminder_offset: form.reminder_offset,
      }

      if (editingItemId) {
        await updateScheduleItem(editingItemId, fields)
        setItems(prev => prev.map(i => i.id === editingItemId ? { ...i, ...fields } : i))
      } else {
        const created = await createScheduleItem(familyId, selectedChildId, {
          ...fields,
          type: fields.type,
          title: fields.title,
          day_of_week: fields.day_of_week,
        })
        setItems(prev => [...prev, created])
      }
      closeForm()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    try {
      await deleteScheduleItem(itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      if (editingItemId === itemId) closeForm()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка удаления'
      setError(msg)
    }
  }

  const updateForm = (patch: Partial<FormData>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }

  const renderForm = () => (
    <div className="bg-gray-700/50 rounded-xl p-4 space-y-3 mt-3">
      <h3 className="text-sm font-medium text-white">
        {editingItemId ? 'Редактировать' : 'Новый элемент'}
      </h3>

      {/* Type selector */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Тип</label>
        <div className="flex gap-2">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateForm({ type: opt.value })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                form.type === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Название"
        value={form.title}
        onChange={e => updateForm({ title: e.target.value })}
        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        autoFocus
      />

      {/* Days of week */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Дни недели</label>
        <div className="flex gap-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`w-10 h-10 rounded-xl text-xs font-medium transition-all ${
                form.day_of_week.includes(day)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {DAY_NAMES[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Начало</label>
          <input
            type="time"
            value={form.start_time}
            onChange={e => updateForm({ start_time: e.target.value })}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        {form.type === 'section' && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Конец</label>
            <input
              type="time"
              value={form.end_time}
              onChange={e => updateForm({ end_time: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Location (sections only) */}
      {form.type === 'section' && (
        <input
          type="text"
          placeholder="Место / адрес"
          value={form.location}
          onChange={e => updateForm({ location: e.target.value })}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      )}

      {/* Reminder */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => updateForm({ has_reminder: !form.has_reminder })}
          className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
            form.has_reminder ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            form.has_reminder ? 'left-5' : 'left-1'
          }`} />
        </button>
        <span className="text-sm text-gray-300">Напоминание</span>
        {form.has_reminder && (
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="number"
              min={1}
              value={form.reminder_offset}
              onChange={e => updateForm({ reminder_offset: Number(e.target.value) })}
              className="w-20 bg-gray-800 border border-gray-600 rounded-xl px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-gray-400">мин раньше</span>
          </div>
        )}
      </div>

      {formError && (
        <div className="text-red-400 text-xs p-2 bg-red-400/10 rounded-lg">{formError}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          onClick={closeForm}
          className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  )

  // Group items by type
  const grouped: Record<ItemType, ScheduleItem[]> = {
    lesson: items.filter(i => i.type === 'lesson'),
    section: items.filter(i => i.type === 'section'),
    routine: items.filter(i => i.type === 'routine'),
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Расписание</h2>

      {/* Child tabs */}
      {loadingChildren ? (
        <div className="flex gap-2 mb-4">
          {[1, 2].map(i => (
            <div key={i} className="h-9 w-24 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">
          Нет детей в семье. Добавьте ребёнка в онбординге.
        </p>
      ) : (
        <div className="flex gap-2 mb-4">
          {children.map(child => (
            <button
              key={child.memberId}
              onClick={() => { setSelectedChildId(child.memberId); closeForm() }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedChildId === child.memberId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {child.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Скрыть</button>
        </div>
      )}

      {/* Items */}
      {loadingItems ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {(['lesson', 'section', 'routine'] as ItemType[]).map(type => {
            const typeItems = grouped[type]
            if (typeItems.length === 0) return null
            return (
              <div key={type} className="mb-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {TYPE_LABELS[type]}
                </h3>
                <div className="space-y-2">
                  {typeItems.map(item => (
                    <div key={item.id}>
                      <div
                        className={`flex items-start gap-3 p-3 rounded-xl bg-gray-700/50 ${
                          editingItemId === item.id ? 'ring-2 ring-indigo-500' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white">{item.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[item.type]}`}>
                              {TYPE_LABELS[item.type].slice(0, -1)}
                            </span>
                          </div>
                          {/* Days chips */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.day_of_week.map(d => (
                              <span key={d} className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded-md">
                                {DAY_NAMES[d]}
                              </span>
                            ))}
                            {item.start_time && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded-md">
                                {item.start_time.slice(0, 5)}
                                {item.end_time && ` – ${item.end_time.slice(0, 5)}`}
                              </span>
                            )}
                            {item.location && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded-md">
                                {item.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => editingItemId === item.id ? closeForm() : openEditForm(item)}
                            className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {editingItemId === item.id && renderForm()}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {items.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              Нет элементов расписания. Добавьте первый!
            </p>
          )}

          {/* Add form (when not editing existing) */}
          {showAddForm && !editingItemId && renderForm()}
        </div>
      )}

      {/* Add button */}
      {!showAddForm && !editingItemId && selectedChildId && (
        <button
          onClick={openAddForm}
          className="w-full py-3 mt-3 border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-xl text-gray-400 hover:text-indigo-400 text-sm font-medium transition-all"
        >
          + Добавить элемент
        </button>
      )}
    </div>
  )
}
