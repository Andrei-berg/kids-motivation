'use client'

/**
 * ============================================================================
 * COACH RATING MODAL - МОДАЛЬНОЕ ОКНО ОЦЕНКИ ТРЕНЕРА
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * Родитель вводит оценку тренера после каждой тренировки
 * 
 * ФИЛОСОФИЯ:
 * - Спорт = для здоровья (первично!)
 * - Награда = только за ТРУД (вторично!)
 * - Оценка тренера = объективный показатель
 * - Нельзя обмануть систему "просто пришёл"
 * 
 * КАК РАБОТАЕТ:
 * 1. Родитель открывает модалку после тренировки
 * 2. Выбирает секцию (футбол, карате, etc)
 * 3. Выбирает оценку тренера (1-5)
 * 4. Добавляет комментарий тренера (опционально)
 * 5. Система начисляет монеты в зависимости от оценки
 * 
 * ТАБЛИЦА НАГРАД/ШТРАФОВ:
 * ┌───────┬──────────┬─────────────────────┐
 * │ Оценка│ Монеты   │ Комментарий         │
 * ├───────┼──────────┼─────────────────────┤
 * │   5   │ +10 💰  │ Пахал! Отлично!     │
 * │   4   │ +5 💰   │ Хорошо, старался    │
 * │   3   │ 0 💰    │ Средне              │
 * │   2   │ -3 💰   │ Ленился             │
 * │   1   │ -10 💰  │ Хулиганил           │
 * └───────┴──────────┴─────────────────────┘
 * ============================================================================
 */

import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { awardCoinsForSport } from '@/lib/wallet-api'

interface CoachRatingModalProps {
  childId: string
  sections: Array<{ id: string; name: string }>
  onClose: () => void
  onSuccess: () => void
}

export default function CoachRatingModal({
  childId,
  sections,
  onClose,
  onSuccess
}: CoachRatingModalProps) {
  const t = useT()
  const [sectionId, setSectionId] = useState('')
  const [coachRating, setCoachRating] = useState<number | null>(null)
  const [coachComment, setCoachComment] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Таблица наград/штрафов
  const RATINGS = [
    {
      value: 5,
      label: t('coachRatingModal.rating5Label'),
      coins: '+10 💰',
      color: 'excellent',
      description: t('coachRatingModal.rating5Desc')
    },
    {
      value: 4,
      label: t('coachRatingModal.rating4Label'),
      coins: '+5 💰',
      color: 'good',
      description: t('coachRatingModal.rating4Desc')
    },
    {
      value: 3,
      label: t('coachRatingModal.rating3Label'),
      coins: '0 💰',
      color: 'medium',
      description: t('coachRatingModal.rating3Desc')
    },
    {
      value: 2,
      label: t('coachRatingModal.rating2Label'),
      coins: '-3 💰',
      color: 'bad',
      description: t('coachRatingModal.rating2Desc')
    },
    {
      value: 1,
      label: t('coachRatingModal.rating1Label'),
      coins: '-10 💰',
      color: 'terrible',
      description: t('coachRatingModal.rating1Desc')
    }
  ]

  const handleSave = async () => {
    if (!sectionId || coachRating === null) {
      alert(t('coachRatingModal.selectSectionAlert'))
      return
    }

    try {
      setSaving(true)

      // Найти название секции
      const section = sections.find(s => s.id === sectionId)
      if (!section) throw new Error('Section not found')

      // Сохранить посещение в базу
      const { error: visitError } = await supabase
        .from('section_visits')
        .insert({
          section_id: sectionId,
          date,
          attended: true,
          coach_rating: coachRating,
          trainer_feedback: coachComment || null
        })

      if (visitError) throw visitError

      // Начислить монеты (может быть 0 или отрицательные!)
      if (coachRating) {
        await awardCoinsForSport(
          childId,
          coachRating,
          section.name,
          coachComment
        )
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving coach rating:', error)
      alert(t('coachRatingModal.saveError') + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const selectedRating = RATINGS.find(r => r.value === coachRating)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content coach-rating-modal" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="modal-header">
          <h2>{t('coachRatingModal.heading')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Философия */}
        <div className="philosophy-section">
          <p className="philosophy-text">
            <strong>{t('coachRatingModal.philosophyImportant')}</strong> {t('coachRatingModal.philosophyText1')}
          </p>
          <p className="philosophy-text">
            {t('coachRatingModal.philosophyText2')}
          </p>
        </div>

        {/* Дата */}
        <div className="form-group">
          <label>{t('coachRatingModal.dateLabel')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Секция */}
        <div className="form-group">
          <label>{t('coachRatingModal.sectionLabel')}</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="form-select"
          >
            <option value="">{t('coachRatingModal.sectionPlaceholder')}</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Оценка тренера */}
        <div className="form-group">
          <label>{t('coachRatingModal.ratingQuestion')}</label>
          <p className="label-hint">
            {t('coachRatingModal.ratingHint')}
          </p>
          
          <div className="ratings-grid">
            {RATINGS.map(rating => (
              <button
                key={rating.value}
                className={`rating-button ${rating.color} ${coachRating === rating.value ? 'selected' : ''}`}
                onClick={() => setCoachRating(rating.value)}
              >
                <div className="rating-label">{rating.label}</div>
                <div className="rating-coins">{rating.coins}</div>
                <div className="rating-description">{rating.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Предпросмотр */}
        {selectedRating && (
          <div className={`rating-preview ${selectedRating.color}`}>
            <div className="preview-icon">
              {selectedRating.value >= 4 ? '💪' : selectedRating.value === 3 ? '😐' : '⚠️'}
            </div>
            <div className="preview-text">
              <strong>{selectedRating.label}</strong>
              <p>{selectedRating.description}</p>
              <p className="preview-coins">{t('coachRatingModal.awarded')}{selectedRating.coins}</p>
            </div>
          </div>
        )}

        {/* Комментарий тренера */}
        <div className="form-group">
          <label>{t('coachRating.comment')} (optional):</label>
          <textarea
            value={coachComment}
            onChange={(e) => setCoachComment(e.target.value)}
            placeholder={t('coachRating.commentPlaceholder')}
            className="form-textarea"
            rows={3}
          />
        </div>

        {/* Сообщение для ребёнка */}
        {coachRating && (
          <div className="child-message">
            <h4>{t('coachRatingModal.childWillSee')}</h4>
            <div className={`message-preview ${selectedRating?.color}`}>
              {coachRating >= 4 ? (
                <p>
                  {selectedRating?.value === 5 ? t('coachRatingModal.previewExcellent') : t('coachRatingModal.previewGood')}
                  <br />
                  {sections.find(s => s.id === sectionId)?.name || 'Training'}
                  <br />
                  {t('coachRatingModal.previewTrainerSays')}"{selectedRating?.description}"
                  <br />
                  <strong>{selectedRating?.coins}</strong>
                  <br />
                  {t('coachRatingModal.previewHealthNote')}
                  <br />
                  {t('coachRatingModal.previewPrideNote')}
                </p>
              ) : coachRating === 3 ? (
                <p>
                  {t('coachRatingModal.previewAverage')}
                  <br />
                  {sections.find(s => s.id === sectionId)?.name || 'Training'}
                  <br />
                  {t('coachRatingModal.previewTrainerSays')}"{selectedRating?.description}"
                  <br />
                  <strong>0 💰</strong>
                  <br />
                  {t('coachRatingModal.previewAverageNote')}
                  <br />
                  {t('coachRatingModal.previewAverageHint')}
                </p>
              ) : (
                <p>
                  {coachRating === 2 ? t('coachRatingModal.previewBad') : t('coachRatingModal.previewVeryBad')}
                  <br />
                  {sections.find(s => s.id === sectionId)?.name || 'Training'}
                  <br />
                  {t('coachRatingModal.previewTrainerSays')}"{selectedRating?.description}"
                  <br />
                  <strong>{selectedRating?.coins}</strong>
                  <br />
                  {t('coachRatingModal.previewBadNote')}
                  <br />
                  {t('coachRatingModal.previewBadHint')}
                  <br />
                  {t('coachRatingModal.previewBadChoice')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>
            {t('coachRating.cancel')}
          </button>
          <button
            className="button primary"
            onClick={handleSave}
            disabled={saving || !sectionId || coachRating === null}
          >
            {saving ? t('coachRatingModal.saving') : t('coachRatingModal.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
