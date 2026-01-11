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
  const [sectionId, setSectionId] = useState('')
  const [coachRating, setCoachRating] = useState<number | null>(null)
  const [coachComment, setCoachComment] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Таблица наград/штрафов
  const RATINGS = [
    { 
      value: 5, 
      label: '5️⃣ Отлично! Пахал!', 
      coins: '+10 💰',
      color: 'excellent',
      description: 'Выкладывался на 100%'
    },
    { 
      value: 4, 
      label: '4️⃣ Хорошо, старался', 
      coins: '+5 💰',
      color: 'good',
      description: 'Работал нормально, старался'
    },
    { 
      value: 3, 
      label: '3️⃣ Средне', 
      coins: '0 💰',
      color: 'medium',
      description: 'Был, но без огня'
    },
    { 
      value: 2, 
      label: '2️⃣ Ленился', 
      coins: '-3 💰',
      color: 'bad',
      description: 'Откровенно ленился'
    },
    { 
      value: 1, 
      label: '1️⃣ Хулиганил', 
      coins: '-10 💰',
      color: 'terrible',
      description: 'Мешал другим / хулиганил'
    }
  ]

  const handleSave = async () => {
    if (!sectionId || coachRating === null) {
      alert('Выберите секцию и оценку!')
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
      alert('Ошибка сохранения! ' + (error as Error).message)
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
          <h2>💪 ОЦЕНКА ТРЕНЕРА</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Философия */}
        <div className="philosophy-section">
          <p className="philosophy-text">
            <strong>Важно:</strong> Награда НЕ за посещение, а за ТРУД!
          </p>
          <p className="philosophy-text">
            Тренер оценивает старание → система начисляет монеты.
          </p>
        </div>

        {/* Дата */}
        <div className="form-group">
          <label>📅 Дата тренировки:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Секция */}
        <div className="form-group">
          <label>⚽ Секция:</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="form-select"
          >
            <option value="">Выберите секцию...</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Оценка тренера */}
        <div className="form-group">
          <label>🏅 Как тренер оценил работу ребёнка?</label>
          <p className="label-hint">
            Спросите у тренера после занятия
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
              <p className="preview-coins">Начислено: {selectedRating.coins}</p>
            </div>
          </div>
        )}

        {/* Комментарий тренера */}
        <div className="form-group">
          <label>💬 Комментарий тренера (опционально):</label>
          <textarea
            value={coachComment}
            onChange={(e) => setCoachComment(e.target.value)}
            placeholder='Например: "Отлично работал, выложился на все 100%!"'
            className="form-textarea"
            rows={3}
          />
        </div>

        {/* Сообщение для ребёнка */}
        {coachRating && (
          <div className="child-message">
            <h4>📱 Ребёнок увидит:</h4>
            <div className={`message-preview ${selectedRating?.color}`}>
              {coachRating >= 4 ? (
                <p>
                  {selectedRating?.value === 5 ? '🔥 ОТЛИЧНО!' : '👍 ХОРОШО!'}
                  <br />
                  {sections.find(s => s.id === sectionId)?.name || 'Тренировка'}
                  <br />
                  Тренер: "{selectedRating?.description}"
                  <br />
                  <strong>{selectedRating?.coins}</strong>
                  <br />
                  💪 Ты тренировался для СЕБЯ! Твоё здоровье улучшается!
                  <br />
                  🏆 Тренер гордится тобой!
                </p>
              ) : coachRating === 3 ? (
                <p>
                  😐 СРЕДНЕ
                  <br />
                  {sections.find(s => s.id === sectionId)?.name || 'Тренировка'}
                  <br />
                  Тренер: "Так себе, мог лучше"
                  <br />
                  <strong>0 💰 (нет награды)</strong>
                  <br />
                  💡 Ты пришёл, но не выложился.
                  <br />
                  В следующий раз пахай → получишь +5-10 💰!
                </p>
              ) : (
                <p>
                  ⚠️ {coachRating === 2 ? 'ПЛОХО!' : 'ОЧЕНЬ ПЛОХО!'}
                  <br />
                  {sections.find(s => s.id === sectionId)?.name || 'Тренировка'}
                  <br />
                  Тренер: "{selectedRating?.description}"
                  <br />
                  <strong>{selectedRating?.coins} (ШТРАФ!)</strong>
                  <br />
                  ❌ ЗАЧЕМ ПРИШЁЛ, ЕСЛИ ЛЕНИЛСЯ?
                  <br />
                  Спорт = не галочка для монет!
                  <br />
                  Два пути: ходи и ПАХАЙ, или не ходи вообще.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>
            Отмена
          </button>
          <button 
            className="button primary" 
            onClick={handleSave}
            disabled={saving || !sectionId || coachRating === null}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
