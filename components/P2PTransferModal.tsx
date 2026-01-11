'use client'

/**
 * ============================================================================
 * P2P TRANSFER MODAL - ПЕРЕВОДЫ МЕЖДУ ДЕТЬМИ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * Дети могут переводить монеты друг другу
 * 
 * ФИЛОСОФИЯ:
 * - Обучение экономике (переговоры, контракты, доверие)
 * - Развитие навыков предпринимательства
 * - Социальные навыки (договориться, выполнить обязательства)
 * - Семейная экономика (старший помогает младшему)
 * 
 * ТИПЫ ПЕРЕВОДОВ:
 * 1. GIFT (подарок) - просто отдал
 * 2. PAYMENT (оплата) - за что-то купил
 * 3. LOAN (займ) - взял в долг, надо вернуть
 * 4. DEAL (сделка) - "сделай X, получишь Y монет"
 * 
 * ЛИМИТЫ:
 * - Макс за раз: 100 💰
 * - Макс в день: 200 💰
 * - Макс в месяц: 500 💰
 * - Одобрение родителя если >100 💰
 * - Макс долг: 200 💰
 * - Макс срок долга: 7 дней
 * 
 * ПРИМЕРЫ:
 * 
 * DEAL: "Адам → Алиму: Вынеси мусор за 30 💰"
 * 1. Адам создаёт deal
 * 2. Алим видит предложение
 * 3. Алим выносит мусор
 * 4. Алим нажимает "Я сделал"
 * 5. Адам проверяет и подтверждает
 * 6. 30 💰 переводятся Алиму
 * 
 * LOAN: "Алим → Адаму: Одолжи 50 💰, верну 55 💰"
 * 1. Алим запрашивает займ
 * 2. Адам одобряет
 * 3. 50 💰 переводятся Алиму
 * 4. Долг записывается (50+5 проценты)
 * 5. Через неделю напоминание
 * 6. Алим возвращает 55 💰
 * ============================================================================
 */

import { useState } from 'react'
import { createP2PTransfer, getWalletSettings } from '@/lib/wallet-api'

interface P2PTransferModalProps {
  fromChildId: string
  toChildId: string
  fromChildName: string
  toChildName: string
  onClose: () => void
  onSuccess: () => void
}

export default function P2PTransferModal({ 
  fromChildId,
  toChildId,
  fromChildName,
  toChildName,
  onClose, 
  onSuccess 
}: P2PTransferModalProps) {
  const [transferType, setTransferType] = useState<'gift' | 'payment' | 'loan' | 'deal'>('gift')
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  
  // Для DEAL
  const [dealDescription, setDealDescription] = useState('')
  
  // Для LOAN
  const [loanInterest, setLoanInterest] = useState<number>(0)
  const [loanDueDays, setLoanDueDays] = useState<number>(7)
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    try {
      setSaving(true)
      setError('')

      // Валидация
      if (amount <= 0) {
        setError('Сумма должна быть больше 0!')
        return
      }

      // Проверить лимиты
      const settings = await getWalletSettings()
      if (amount > settings.p2p_max_per_transfer) {
        setError(`Максимум за раз: ${settings.p2p_max_per_transfer} 💰`)
        return
      }

      // Для DEAL нужно описание
      if (transferType === 'deal' && !dealDescription) {
        setError('Опиши что нужно сделать!')
        return
      }

      // Рассчитать дату возврата займа
      const loanDueDate = transferType === 'loan'
        ? new Date(Date.now() + loanDueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null

      // Создать перевод
      await createP2PTransfer({
        from_child_id: fromChildId,
        to_child_id: toChildId,
        amount,
        transfer_type: transferType,
        note,
        deal_description: transferType === 'deal' ? dealDescription : null,
        loan_interest: transferType === 'loan' ? loanInterest : 0,
        loan_due_date: loanDueDate
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creating transfer:', err)
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const totalLoanRepayment = amount + loanInterest

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p2p-transfer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="modal-header">
          <h2>💸 Перевод монет</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Направление перевода */}
        <div className="transfer-direction">
          <div className="from-child">
            <div className="child-avatar">👦</div>
            <div className="child-name">{fromChildName}</div>
            <div className="child-label">Отправитель</div>
          </div>
          <div className="transfer-arrow">→</div>
          <div className="to-child">
            <div className="child-avatar">👶</div>
            <div className="child-name">{toChildName}</div>
            <div className="child-label">Получатель</div>
          </div>
        </div>

        {/* Тип перевода */}
        <div className="form-group">
          <label>Тип перевода:</label>
          <div className="transfer-types">
            <button
              className={`transfer-type-button ${transferType === 'gift' ? 'active' : ''}`}
              onClick={() => setTransferType('gift')}
            >
              <span className="type-icon">🎁</span>
              <span className="type-label">Подарок</span>
              <span className="type-description">Просто отдал</span>
            </button>
            
            <button
              className={`transfer-type-button ${transferType === 'payment' ? 'active' : ''}`}
              onClick={() => setTransferType('payment')}
            >
              <span className="type-icon">💳</span>
              <span className="type-label">Оплата</span>
              <span className="type-description">За что-то купил</span>
            </button>
            
            <button
              className={`transfer-type-button ${transferType === 'loan' ? 'active' : ''}`}
              onClick={() => setTransferType('loan')}
            >
              <span className="type-icon">🏦</span>
              <span className="type-label">Займ</span>
              <span className="type-description">Взял в долг</span>
            </button>
            
            <button
              className={`transfer-type-button ${transferType === 'deal' ? 'active' : ''}`}
              onClick={() => setTransferType('deal')}
            >
              <span className="type-icon">🤝</span>
              <span className="type-label">Сделка</span>
              <span className="type-description">Сделай → получишь</span>
            </button>
          </div>
        </div>

        {/* Сумма */}
        <div className="form-group">
          <label>💰 Сумма:</label>
          <input
            type="number"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Сколько монет?"
            className="form-input"
            min="1"
            max="100"
          />
          <div className="form-hint">
            Максимум за раз: 100 💰
          </div>
        </div>

        {/* Для DEAL: описание */}
        {transferType === 'deal' && (
          <div className="form-group">
            <label>📝 Что нужно сделать?</label>
            <textarea
              value={dealDescription}
              onChange={(e) => setDealDescription(e.target.value)}
              placeholder='Например: "Вынеси мусор" или "Помой посуду"'
              className="form-textarea"
              rows={3}
            />
            <div className="deal-preview">
              <strong>Сделка:</strong>
              <p>
                {toChildName} сделает: "{dealDescription || '...'}"
                <br />
                {fromChildName} заплатит: {amount} 💰
              </p>
            </div>
          </div>
        )}

        {/* Для LOAN: проценты и срок */}
        {transferType === 'loan' && (
          <>
            <div className="form-group">
              <label>💹 Проценты (опционально):</label>
              <input
                type="number"
                value={loanInterest || ''}
                onChange={(e) => setLoanInterest(Number(e.target.value))}
                placeholder="Например: 5"
                className="form-input"
                min="0"
                max="50"
              />
              <div className="form-hint">
                Сколько дополнительно вернуть? (0-50 💰)
              </div>
            </div>

            <div className="form-group">
              <label>⏰ Срок возврата:</label>
              <select
                value={loanDueDays}
                onChange={(e) => setLoanDueDays(Number(e.target.value))}
                className="form-select"
              >
                <option value="1">1 день</option>
                <option value="3">3 дня</option>
                <option value="7">7 дней (неделя)</option>
              </select>
            </div>

            <div className="loan-preview">
              <strong>Займ:</strong>
              <p>
                {toChildName} получит: {amount} 💰
                <br />
                Вернуть нужно: {totalLoanRepayment} 💰
                {loanInterest > 0 && ` (из них ${loanInterest} 💰 проценты)`}
                <br />
                Срок: {loanDueDays} {loanDueDays === 1 ? 'день' : loanDueDays < 5 ? 'дня' : 'дней'}
              </p>
            </div>
          </>
        )}

        {/* Примечание */}
        <div className="form-group">
          <label>💬 Примечание (опционально):</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              transferType === 'gift' ? 'Например: "С днём рождения!"' :
              transferType === 'payment' ? 'Например: "За игрушку"' :
              transferType === 'loan' ? 'Например: "На неделю"' :
              'Например: "Важная сделка"'
            }
            className="form-input"
          />
        </div>

        {/* Предупреждения */}
        {amount > 100 && (
          <div className="warning-message">
            ⚠️ Суммы больше 100 💰 требуют одобрения родителя!
          </div>
        )}

        {transferType === 'loan' && (
          <div className="info-message">
            💡 Долг будет записан. Напоминание придёт за день до срока.
          </div>
        )}

        {transferType === 'deal' && (
          <div className="info-message">
            💡 Деньги переведутся только после выполнения и подтверждения.
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Кнопки */}
        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>
            Отмена
          </button>
          <button 
            className="button primary" 
            onClick={handleSubmit}
            disabled={saving || amount <= 0 || (transferType === 'deal' && !dealDescription)}
          >
            {saving ? 'Отправка...' : 
             transferType === 'deal' ? 'Создать сделку' :
             transferType === 'loan' ? 'Одолжить' :
             'Отправить'}
          </button>
        </div>

        {/* Обучающая информация */}
        <div className="education-section">
          <h4>💡 Что ты учишь:</h4>
          <ul>
            {transferType === 'gift' && (
              <>
                <li>🎁 Щедрость и забота о других</li>
                <li>❤️ Радость делать приятное</li>
              </>
            )}
            {transferType === 'payment' && (
              <>
                <li>💳 Честная торговля</li>
                <li>🤝 Договорённости и выполнение обязательств</li>
              </>
            )}
            {transferType === 'loan' && (
              <>
                <li>🏦 Как работают займы</li>
                <li>📈 Что такое проценты</li>
                <li>⏰ Важность вернуть вовремя</li>
                <li>🤝 Доверие и ответственность</li>
              </>
            )}
            {transferType === 'deal' && (
              <>
                <li>🤝 Переговоры и договорённости</li>
                <li>📝 Контракты (устные)</li>
                <li>💪 Делегирование задач</li>
                <li>👔 Предпринимательство</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
