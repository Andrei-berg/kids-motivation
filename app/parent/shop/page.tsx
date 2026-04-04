'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRewards, addReward, updateReward, deleteReward } from '@/lib/repositories/wallet.repo'
import type { Reward } from '@/lib/models/wallet.types'

// ============================================================================
// STARTER TEMPLATES
// ============================================================================

const STARTER_TEMPLATES = [
  { title: 'Кино', icon: '🎬', category: 'experience', price_coins: 150, description: 'Поход в кинотеатр' },
  { title: 'Игра на телефоне 1 час', icon: '📱', category: 'virtual', price_coins: 50, description: 'Дополнительный час экранного времени' },
  { title: 'Поздний отбой', icon: '🌙', category: 'virtual', price_coins: 80, description: 'Лечь спать на 1 час позже' },
  { title: 'Пицца', icon: '🍕', category: 'material', price_coins: 120, description: 'Заказать пиццу' },
  { title: 'Поездка в парк', icon: '🎡', category: 'experience', price_coins: 200, description: 'Поездка в парк аттракционов' },
]

// ============================================================================
// TYPES
// ============================================================================

type CategoryKey = 'virtual' | 'material' | 'experience' | 'money'

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  virtual: 'Виртуальный',
  material: 'Материальный',
  experience: 'Опыт',
  money: 'За деньги',
}

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  virtual: 'bg-blue-900 text-blue-300',
  material: 'bg-green-900 text-green-300',
  experience: 'bg-purple-900 text-purple-300',
  money: 'bg-yellow-900 text-yellow-300',
}

interface FormData {
  icon: string
  title: string
  description: string
  category: CategoryKey
  price_coins: number
  for_child: string | null
  auto_approve: boolean
  is_active: boolean
}

const DEFAULT_FORM: FormData = {
  icon: '🎁',
  title: '',
  description: '',
  category: 'virtual',
  price_coins: 50,
  for_child: null,
  auto_approve: false,
  is_active: true,
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ParentShopPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Templates state
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const reloadRewards = useCallback(async () => {
    try {
      // Pass activeOnly: false to show ALL rewards (including inactive) for admin view
      const data = await getRewards({ activeOnly: false } as Parameters<typeof getRewards>[0])
      setRewards(data)
    } catch (e) {
      setError('Ошибка загрузки магазина')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    reloadRewards().finally(() => setLoading(false))
  }, [reloadRewards])

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  function openCreateForm() {
    setEditingReward(null)
    setFormData(DEFAULT_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(reward: Reward) {
    setEditingReward(reward)
    setFormData({
      icon: reward.icon,
      title: reward.title,
      description: reward.description ?? '',
      category: (reward.category as CategoryKey) ?? 'virtual',
      price_coins: reward.price_coins ?? 50,
      for_child: reward.for_child,
      // auto_approve not in Reward type yet — defaults to false until DB migration
      auto_approve: (reward as Reward & { auto_approve?: boolean }).auto_approve ?? false,
      is_active: reward.is_active,
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingReward(null)
    setFormError(null)
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) {
      setFormError('Введите название позиции')
      return
    }
    if (formData.price_coins < 1) {
      setFormError('Цена должна быть не менее 1 монеты')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    const payload: Partial<Reward> & { auto_approve?: boolean } = {
      icon: formData.icon,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      category: formData.category,
      reward_type: 'coins',
      price_coins: formData.price_coins,
      for_child: formData.for_child,
      is_active: formData.is_active,
      // NOTE: auto_approve requires DB migration (see wallet.repo.ts)
      auto_approve: formData.auto_approve,
    }

    try {
      if (editingReward) {
        await updateReward(editingReward.id, payload)
      } else {
        await addReward(payload)
      }
      closeForm()
      await reloadRewards()
    } catch (e) {
      setFormError('Ошибка сохранения. Проверьте соединение.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // ============================================================================
  // ACTIVE TOGGLE
  // ============================================================================

  async function toggleActive(reward: Reward) {
    try {
      await updateReward(reward.id, { is_active: !reward.is_active })
      await reloadRewards()
    } catch (e) {
      setError('Ошибка обновления статуса')
    }
  }

  // ============================================================================
  // DELETE FLOW
  // ============================================================================

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    try {
      await deleteReward(id)
      setDeletingId(null)
      await reloadRewards()
    } catch (e) {
      setError('Ошибка удаления позиции')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ============================================================================
  // STARTER TEMPLATES
  // ============================================================================

  async function loadStarterTemplates() {
    const confirmed = window.confirm('Загрузить 5 стандартных позиций в магазин?')
    if (!confirmed) return

    setLoadingTemplates(true)
    try {
      await Promise.all(
        STARTER_TEMPLATES.map(t =>
          addReward({
            ...t,
            reward_type: 'coins',
            is_active: true,
            for_child: null,
          })
        )
      )
      await reloadRewards()
      setTemplatesLoaded(true)
    } catch (e) {
      setError('Ошибка загрузки шаблонов')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Магазин</h1>
        <div className="flex gap-2">
          <button
            onClick={loadStarterTemplates}
            disabled={loadingTemplates || templatesLoaded}
            className="bg-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            {loadingTemplates ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Загрузка...
              </span>
            ) : templatesLoaded ? (
              'Шаблоны загружены'
            ) : (
              'Загрузить шаблоны'
            )}
          </button>
          <button
            onClick={openCreateForm}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-500 transition-colors"
          >
            + Добавить позицию
          </button>
        </div>
      </div>

      {/* Global error */}
      {error && (
        <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Закрыть</button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 mt-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingReward ? 'Редактировать позицию' : 'Новая позиция'}
          </h2>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Icon */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Иконка (эмодзи)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={e => setFormData(f => ({ ...f, icon: e.target.value }))}
                maxLength={4}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 w-20 text-center text-lg border border-gray-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                maxLength={60}
                required
                placeholder="Например: Кино"
                className="bg-gray-800 text-white rounded-lg px-3 py-2 w-full border border-gray-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Описание (необязательно)</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Краткое описание"
                className="bg-gray-800 text-white rounded-lg px-3 py-2 w-full border border-gray-700 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Тип</label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as CategoryKey }))}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 w-full border border-gray-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="virtual">Виртуальный</option>
                <option value="material">Материальный</option>
                <option value="experience">Опыт</option>
                <option value="money">За деньги</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Цена (монеты) *</label>
              <input
                type="number"
                value={formData.price_coins}
                onChange={e => setFormData(f => ({ ...f, price_coins: parseInt(e.target.value) || 1 }))}
                min={1}
                required
                className="bg-gray-800 text-white rounded-lg px-3 py-2 w-32 border border-gray-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* For child */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Для кого</label>
              <select
                value={formData.for_child ?? ''}
                onChange={e => setFormData(f => ({ ...f, for_child: e.target.value || null }))}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 w-full border border-gray-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Для всех</option>
                <option value="adam">Адам</option>
                <option value="alim">Алим</option>
              </select>
            </div>

            {/* Auto-approve */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto_approve"
                checked={formData.auto_approve}
                onChange={e => setFormData(f => ({ ...f, auto_approve: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500"
              />
              <label htmlFor="auto_approve" className="text-sm text-gray-300">
                Авто-одобрение (не требует подтверждения)
              </label>
            </div>

            {/* Active (edit mode only) */}
            {editingReward && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">
                  Активна (видна детям)
                </label>
              </div>
            )}

            {/* Form error */}
            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {formSubmitting ? 'Сохранение...' : editingReward ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={formSubmitting}
                className="bg-gray-700 text-gray-200 rounded-lg px-5 py-2 text-sm hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Item List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-700 rounded" />
                    <div className="h-3 w-20 bg-gray-700 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-12 bg-gray-700 rounded-full" />
                  <div className="h-6 w-16 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="text-base">Магазин пуст. Добавьте первую позицию или загрузите шаблоны.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map(reward => (
            <div key={reward.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between gap-3">
              {/* Left: icon + info */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{reward.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium truncate">{reward.title}</span>
                    <span className="text-xs bg-gray-700 text-yellow-300 px-2 py-0.5 rounded-full flex-shrink-0">
                      💰 {reward.price_coins} монет
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[reward.category as CategoryKey] ?? 'bg-gray-700 text-gray-300'}`}>
                      {CATEGORY_LABELS[reward.category as CategoryKey] ?? reward.category}
                    </span>
                    {reward.for_child && (
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        {reward.for_child === 'adam' ? 'Адам' : 'Алим'}
                      </span>
                    )}
                  </div>
                  {reward.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{reward.description}</p>
                  )}
                </div>
              </div>

              {/* Right: controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* is_active toggle */}
                <button
                  onClick={() => toggleActive(reward)}
                  title={reward.is_active ? 'Деактивировать' : 'Активировать'}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    reward.is_active
                      ? 'bg-green-800 text-green-300 hover:bg-green-700'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {reward.is_active ? 'Активна' : 'Скрыта'}
                </button>

                {/* Edit button */}
                {deletingId === reward.id ? (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-gray-300">Удалить «{reward.title}»?</span>
                    <button
                      onClick={() => handleDelete(reward.id)}
                      disabled={deleteLoading}
                      className="bg-red-700 text-white rounded px-2 py-0.5 text-xs hover:bg-red-600 disabled:opacity-50"
                    >
                      Да
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      disabled={deleteLoading}
                      className="bg-gray-700 text-gray-200 rounded px-2 py-0.5 text-xs hover:bg-gray-600 disabled:opacity-50"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openEditForm(reward)}
                      title="Редактировать"
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingId(reward.id)}
                      title="Удалить"
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
