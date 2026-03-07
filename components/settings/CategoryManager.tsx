'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCategories,
  createCategory,
  toggleCategory,
  deleteCategory,
} from '@/lib/categories-api'
import type { Category } from '@/lib/categories-api'

const EMOJI_PICKER = ['📚','🏠','⚽','⏰','🎨','🎵','🍳','💪','🧘','🎯','📖','🌟','🎮','🚴','🏊','✈️','🎭','🔬','💻','🎁']

const TYPE_OPTIONS = [
  { value: 'study', label: 'Учёба' },
  { value: 'home', label: 'Дом' },
  { value: 'sport', label: 'Спорт' },
  { value: 'routine', label: 'Распорядок' },
  { value: 'custom', label: 'Другое' },
] as const

type CategoryType = 'study' | 'home' | 'sport' | 'routine' | 'custom'

const TYPE_LABELS: Record<CategoryType, string> = {
  study: 'Учёба',
  home: 'Дом',
  sport: 'Спорт',
  routine: 'Распорядок',
  custom: 'Другое',
}

const TYPE_COLORS: Record<CategoryType, string> = {
  study: 'bg-blue-500/20 text-blue-400',
  home: 'bg-green-500/20 text-green-400',
  sport: 'bg-orange-500/20 text-orange-400',
  routine: 'bg-purple-500/20 text-purple-400',
  custom: 'bg-gray-500/20 text-gray-400',
}

interface Props {
  familyId: string
}

export default function CategoryManager({ familyId }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📚')
  const [newType, setNewType] = useState<CategoryType>('study')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCategories(familyId)
      setCategories(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки категорий'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleToggle = async (cat: Category) => {
    // Optimistic update
    setCategories(prev =>
      prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c)
    )
    try {
      await toggleCategory(cat.id, !cat.is_active)
    } catch {
      // Revert on failure
      setCategories(prev =>
        prev.map(c => c.id === cat.id ? { ...c, is_active: cat.is_active } : c)
      )
      setError('Не удалось изменить статус категории')
    }
  }

  const handleDeleteConfirm = async (categoryId: string) => {
    setDeleting(true)
    try {
      await deleteCategory(categoryId)
      setCategories(prev => prev.filter(c => c.id !== categoryId))
      setConfirmDeleteId(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка удаления'
      setError(msg)
    } finally {
      setDeleting(false)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) {
      setAddError('Введите название категории')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      const created = await createCategory(familyId, {
        name: newName.trim(),
        icon: newIcon,
        type: newType,
      })
      setCategories(prev => [...prev, created])
      setNewName('')
      setNewIcon('📚')
      setNewType('study')
      setShowAddForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка создания категории'
      setAddError(msg)
    } finally {
      setAdding(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Категории</h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Категории</h2>
        <span className="text-gray-400 text-sm">{categories.length} категорий</span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Скрыть</button>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-2 mb-4">
        {categories.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-6">
            Нет категорий. Создайте первую!
          </p>
        )}
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-opacity ${
              cat.is_active ? 'bg-gray-700/50' : 'bg-gray-700/20 opacity-60'
            }`}
          >
            {/* Icon */}
            <span className="text-2xl w-8 text-center flex-shrink-0">{cat.icon}</span>

            {/* Name + type */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">{cat.name}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[cat.type]}`}>
                {TYPE_LABELS[cat.type]}
              </span>
              {cat.is_default && (
                <span className="ml-2 text-xs text-gray-500">Стандартная</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(cat)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  cat.is_active ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
                title={cat.is_active ? 'Отключить' : 'Включить'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  cat.is_active ? 'left-5' : 'left-1'
                }`} />
              </button>

              {/* Delete (non-default only) */}
              {!cat.is_default && (
                confirmDeleteId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteConfirm(cat.id)}
                      disabled={deleting}
                      className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting ? '...' : 'Да'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                      Нет
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(cat.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
                    title="Удалить категорию"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )
              )}
            </div>
          </div>
        ))}

        {/* Confirm delete text */}
        {confirmDeleteId && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
            Удалить категорию и все её задачи? Это действие нельзя отменить.
          </div>
        )}
      </div>

      {/* Add form */}
      {showAddForm ? (
        <div className="bg-gray-700/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">Новая категория</h3>

          {/* Name input */}
          <input
            type="text"
            placeholder="Название категории"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            autoFocus
          />

          {/* Emoji picker */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PICKER.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewIcon(emoji)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    newIcon === emoji
                      ? 'bg-indigo-600 ring-2 ring-indigo-400'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Type selector */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Тип</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as CategoryType)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Add error */}
          {addError && (
            <div className="text-red-400 text-xs p-2 bg-red-400/10 rounded-lg">{addError}</div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {adding ? 'Создание...' : 'Создать'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddError(null) }}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-xl text-gray-400 hover:text-indigo-400 text-sm font-medium transition-all"
        >
          + Добавить категорию
        </button>
      )}
    </div>
  )
}
