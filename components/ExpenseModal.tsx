'use client'

import { useState, useEffect } from 'react'
import { addExpense, ExpenseCategory } from '@/lib/expenses-api'
import type { FamilyMember } from '@/lib/hooks/useFamilyMembers'
import { useT } from '@/lib/i18n'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  categories: ExpenseCategory[]
  onSuccess: () => void
  members: FamilyMember[]
}

export default function ExpenseModal({ isOpen, onClose, categories, onSuccess, members }: ExpenseModalProps) {
  const t = useT()
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
      setError(t('expenseModal.nameRequired'))
      return
    }

    if (!amount || Number(amount) <= 0) {
      setError(t('expenseModal.amountRequired'))
      return
    }

    if (!categoryId) {
      setError(t('expenseModal.categoryRequired'))
      return
    }

    if (!date) {
      setError(t('expenseModal.dateRequired'))
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
      setError(t('expenseModal.saveError'))
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
          <h2 className="expense-modal-title">+ {t('expenseModal.title')}</h2>
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
              {t('expenseModal.titleLabel')} <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={t('expenseModal.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Сумма */}
          <div className="form-group">
            <label className="form-label">
              {t('expenseModal.amountLabel')} <span className="required">*</span>
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
              {t('expenseModal.categoryLabel')} <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">{t('expenseModal.categoryPlaceholder')}</option>
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
              {t('expenseModal.forWhom')} <span className="required">*</span>
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
              {t('expenseModal.dateLabel')} <span className="required">*</span>
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
              <span>{t('expenseModal.recurring')}</span>
            </label>
          </div>

          {/* Период (если повторяется) */}
          {isRecurring && (
            <div className="form-group">
              <label className="form-label">{t('expenseModal.period')}</label>
              <select
                className="form-select"
                value={recurringPeriod}
                onChange={(e) => setRecurringPeriod(e.target.value)}
              >
                <option value="weekly">{t('expenseModal.weekly')}</option>
                <option value="monthly">{t('expenseModal.monthly')}</option>
              </select>
            </div>
          )}

          {/* Заметки */}
          <div className="form-group">
            <label className="form-label">{t('expenseModal.notes')}</label>
            <textarea
              className="form-textarea"
              placeholder={t('expenseModal.notesPlaceholder')}
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
              {t('expenseModal.cancel')}
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving}
            >
              {saving ? t('expenseModal.savingBtn') : t('expenseModal.saveBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
