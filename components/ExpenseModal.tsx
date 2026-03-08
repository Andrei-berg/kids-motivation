'use client'

import { useState, useEffect } from 'react'
import { addExpense, ExpenseCategory } from '@/lib/expenses-api'
import type { FamilyMember } from '@/lib/hooks/useFamilyMembers'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  categories: ExpenseCategory[]
  onSuccess: () => void
  members: FamilyMember[]
}

export default function ExpenseModal({ isOpen, onClose, categories, onSuccess, members }: ExpenseModalProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [date, setDate] = useState(getTodayDate())
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPeriod, setRecurringPeriod] = useState('monthly')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize selectedMemberId when modal opens or members changes
  useEffect(() => {
    if (isOpen && members.length > 0) {
      setSelectedMemberId(members[0].id)
    }
  }, [isOpen, members])

  function getTodayDate() {
    return new Date().toISOString().split('T')[0]
  }

  function resetForm() {
    setTitle('')
    setAmount('')
    setCategoryId('')
    setSelectedMemberId('')
    setDate(getTodayDate())
    setIsRecurring(false)
    setRecurringPeriod('monthly')
    setNote('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Валидация
    if (!title.trim()) {
      setError('Введите название')
      return
    }

    if (!amount || Number(amount) <= 0) {
      setError('Введите корректную сумму')
      return
    }

    if (!categoryId) {
      setError('Выберите категорию')
      return
    }

    if (!date) {
      setError('Выберите дату')
      return
    }

    try {
      setSaving(true)

      await addExpense({
        childId: selectedMemberId,
        title: title.trim(),
        amount: Number(amount),
        categoryId,
        date,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : undefined,
        note: note.trim() || undefined,
        createdBy: 'parent' // TODO: get from auth
      })

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error adding expense:', err)
      setError('Ошибка сохранения. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (saving) return
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="expense-modal-header">
          <h2 className="expense-modal-title">+ Добавить расход</h2>
          <button
            className="expense-modal-close"
            onClick={handleClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="expense-modal-form">
          {/* Название */}
          <div className="form-group">
            <label className="form-label">
              Название <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Например: Репетитор по математике"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Сумма */}
          <div className="form-group">
            <label className="form-label">
              Сумма <span className="required">*</span>
            </label>
            <div className="form-input-with-suffix">
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
              <span className="input-suffix">₽</span>
            </div>
          </div>

          {/* Категория */}
          <div className="form-group">
            <label className="form-label">
              Категория <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Выберите категорию</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Для кого */}
          <div className="form-group">
            <label className="form-label">
              Для кого <span className="required">*</span>
            </label>
            <div className="form-radio-group">
              {members.map(member => (
                <label key={member.id} className="form-radio">
                  <input
                    type="radio"
                    name="childId"
                    value={member.id}
                    checked={selectedMemberId === member.id}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                  />
                  <span>{member.avatar_url && !member.avatar_url.startsWith('http') ? member.avatar_url : '👦'} {member.display_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Дата */}
          <div className="form-group">
            <label className="form-label">
              Дата <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Повторяется */}
          <div className="form-group">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <span>Повторяется</span>
            </label>
          </div>

          {/* Период (если повторяется) */}
          {isRecurring && (
            <div className="form-group">
              <label className="form-label">Период</label>
              <select
                className="form-select"
                value={recurringPeriod}
                onChange={(e) => setRecurringPeriod(e.target.value)}
              >
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
              </select>
            </div>
          )}

          {/* Заметки */}
          <div className="form-group">
            <label className="form-label">Заметки</label>
            <textarea
              className="form-textarea"
              placeholder="Дополнительная информация..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="form-error">
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div className="expense-modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving}
            >
              {saving ? '💾 Сохранение...' : '💾 Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
