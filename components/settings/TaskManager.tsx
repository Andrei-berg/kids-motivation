'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/categories-api'
import { getFamilyChildren } from '@/lib/onboarding-api'
import type { Category, Task } from '@/lib/categories-api'
import type { ChildProfile } from '@/lib/onboarding-api'

interface Props {
  familyId: string
  categories: Category[]
}

interface TaskFormData {
  title: string
  coins_reward: number
  coins_penalty: number
  is_required: boolean
  child_member_id: string | null
  reminder_time: string
  notification_text: string
}

const DEFAULT_FORM: TaskFormData = {
  title: '',
  coins_reward: 0,
  coins_penalty: 0,
  is_required: false,
  child_member_id: null,
  reminder_time: '',
  notification_text: '',
}

export default function TaskManager({ familyId, categories }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  )
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Children for assignment
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [childrenLoaded, setChildrenLoaded] = useState(false)

  // Form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<TaskFormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Update selected category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  // Load tasks when category changes
  const loadTasks = useCallback(async () => {
    if (!selectedCategoryId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTasks(familyId, selectedCategoryId)
      setTasks(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки задач'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [familyId, selectedCategoryId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Load children once (all children in family, not just unlinked)
  useEffect(() => {
    if (childrenLoaded) return
    const loadChildren = async () => {
      try {
        // getFamilyChildren returns only unlinked children; for settings we fetch all
        const data = await getFamilyChildren(familyId)
        setChildren(data)
      } catch {
        // Non-fatal — "Все дети" is the default
      } finally {
        setChildrenLoaded(true)
      }
    }
    loadChildren()
  }, [familyId, childrenLoaded])

  const openAddForm = () => {
    setEditingTaskId(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
    setShowAddForm(true)
  }

  const openEditForm = (task: Task) => {
    setShowAddForm(false)
    setEditingTaskId(task.id)
    setForm({
      title: task.title,
      coins_reward: task.coins_reward,
      coins_penalty: task.coins_penalty,
      is_required: task.is_required,
      child_member_id: task.child_member_id,
      reminder_time: task.reminder_time ?? '',
      notification_text: task.notification_text ?? '',
    })
    setFormError(null)
  }

  const closeForm = () => {
    setShowAddForm(false)
    setEditingTaskId(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Введите название задачи')
      return
    }
    if (!selectedCategoryId) return

    setSaving(true)
    setFormError(null)
    try {
      const fields = {
        title: form.title.trim(),
        coins_reward: form.coins_reward,
        coins_penalty: form.coins_penalty,
        is_required: form.is_required,
        child_member_id: form.child_member_id || null,
        reminder_time: form.reminder_time || null,
        notification_text: form.notification_text.trim() || null,
      }

      if (editingTaskId) {
        await updateTask(editingTaskId, fields)
        setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, ...fields } : t))
      } else {
        const created = await createTask(familyId, {
          category_id: selectedCategoryId,
          ...fields,
        })
        setTasks(prev => [...prev, created])
      }
      closeForm()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения задачи'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      if (editingTaskId === taskId) closeForm()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка удаления задачи'
      setError(msg)
    }
  }

  const updateForm = (patch: Partial<TaskFormData>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }

  // Shared form UI
  const renderForm = () => (
    <div className="bg-gray-700/50 rounded-xl p-4 space-y-3 mt-3">
      <h3 className="text-sm font-medium text-white">
        {editingTaskId ? 'Редактировать задачу' : 'Новая задача'}
      </h3>

      {/* Title */}
      <input
        type="text"
        placeholder="Название задачи"
        value={form.title}
        onChange={e => updateForm({ title: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        autoFocus
      />

      {/* Coins */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Монеты за выполнение</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-sm font-medium">+</span>
            <input
              type="number"
              min={0}
              value={form.coins_reward}
              onChange={e => updateForm({ coins_reward: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Штраф за пропуск</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-sm font-medium">-</span>
            <input
              type="number"
              min={0}
              value={form.coins_penalty}
              onChange={e => updateForm({ coins_penalty: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Required + Child assignment */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2.5">
          <span className="text-sm text-gray-300 flex-1">Обязательная</span>
          <button
            onClick={() => updateForm({ is_required: !form.is_required })}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              form.is_required ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              form.is_required ? 'left-5' : 'left-1'
            }`} />
          </button>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Для кого</label>
          <select
            value={form.child_member_id ?? ''}
            onChange={e => updateForm({ child_member_id: e.target.value || null })}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Все дети</option>
            {children.map(child => (
              <option key={child.memberId} value={child.memberId}>
                {child.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reminder time */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Время напоминания (необязательно)</label>
        <input
          type="time"
          value={form.reminder_time}
          onChange={e => updateForm({ reminder_time: e.target.value })}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Notification text */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Текст уведомления (необязательно)</label>
        <textarea
          rows={2}
          placeholder="Например: Эй, загляни в комнату — порядок или бардак? 🏠"
          value={form.notification_text}
          onChange={e => updateForm({ notification_text: e.target.value })}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Form error */}
      {formError && (
        <div className="text-red-400 text-xs p-2 bg-red-400/10 rounded-lg">{formError}</div>
      )}

      {/* Buttons */}
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Задачи</h2>
      </div>

      {/* Category selector */}
      {categories.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">
          Сначала создайте категории в разделе «Категории».
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-sm transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {cat.icon} {cat.name}
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

      {/* Tasks list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.length === 0 && selectedCategoryId && (
            <p className="text-gray-500 text-sm text-center py-4">
              В этой категории нет задач. Добавьте первую!
            </p>
          )}

          {tasks.map(task => (
            <div key={task.id}>
              <div
                className={`flex items-center gap-3 p-3 rounded-xl bg-gray-700/50 ${
                  editingTaskId === task.id ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">{task.title}</span>
                    {task.is_required && (
                      <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                        Обязательная
                      </span>
                    )}
                    {task.child_member_id && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                        {children.find(c => c.memberId === task.child_member_id)?.displayName ?? 'Только один'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-0.5">
                    {task.coins_reward > 0 && (
                      <span className="text-xs text-green-400">+{task.coins_reward} монет</span>
                    )}
                    {task.coins_penalty > 0 && (
                      <span className="text-xs text-red-400">-{task.coins_penalty} штраф</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => editingTaskId === task.id ? closeForm() : openEditForm(task)}
                    className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {editingTaskId === task.id && renderForm()}
            </div>
          ))}

          {/* Add form (when not editing existing) */}
          {showAddForm && !editingTaskId && renderForm()}
        </div>
      )}

      {/* Add button */}
      {!showAddForm && !editingTaskId && selectedCategoryId && (
        <button
          onClick={openAddForm}
          className="w-full py-3 mt-3 border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-xl text-gray-400 hover:text-indigo-400 text-sm font-medium transition-all"
        >
          + Добавить задачу
        </button>
      )}
    </div>
  )
}
