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
import { useT } from '@/lib/i18n'
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
  const t = useT()
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
        setError(t('p2pTransferModal.amountError'))
        return
      }

      // Проверить лимиты
      const settings = await getWalletSettings()
      if (amount > settings.p2p_max_per_transfer) {
        setError(t('p2pTransferModal.maxError', { max: settings.p2p_max_per_transfer }))
        return
      }

      // Для DEAL нужно описание
      if (transferType === 'deal' && !dealDescription) {
        setError(t('p2pTransferModal.dealDescError'))
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
          <h2>{t('p2pTransferModal.title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Направление перевода */}
        <div className="transfer-direction">
          <div className="from-child">
            <div className="child-avatar">👦</div>
            <div className="child-name">{fromChildName}</div>
            <div className="child-label">{t('p2pTransferModal.senderLabel')}</div>
          </div>
          <div className="transfer-arrow">→</div>
          <div className="to-child">
            <div className="child-avatar">👶</div>
            <div className="child-name">{toChildName}</div>
            <div className="child-label">{t('p2pTransferModal.receiverLabel')}</div>
          </div>
        </div>

        {/* Тип перевода */}
        <div className="form-group">
          <label>{t('p2pTransferModal.transferTypeLabel')}</label>
          <div className="transfer-types">
            <button
              className={`transfer-type-button ${transferType === 'gift' ? 'active' : ''}`}
              onClick={() => setTransferType('gift')}
            >
              <span className="type-icon">🎁</span>
              <span className="type-label">{t('p2pTransferModal.typeGiftLabel')}</span>
              <span className="type-description">{t('p2pTransferModal.typeGiftDesc')}</span>
            </button>

            <button
              className={`transfer-type-button ${transferType === 'payment' ? 'active' : ''}`}
              onClick={() => setTransferType('payment')}
            >
              <span className="type-icon">💳</span>
              <span className="type-label">{t('p2pTransferModal.typePaymentLabel')}</span>
              <span className="type-description">{t('p2pTransferModal.typePaymentDesc')}</span>
            </button>

            <button
              className={`transfer-type-button ${transferType === 'loan' ? 'active' : ''}`}
              onClick={() => setTransferType('loan')}
            >
              <span className="type-icon">🏦</span>
              <span className="type-label">{t('p2pTransferModal.typeLoanLabel')}</span>
              <span className="type-description">{t('p2pTransferModal.typeLoanDesc')}</span>
            </button>

            <button
              className={`transfer-type-button ${transferType === 'deal' ? 'active' : ''}`}
              onClick={() => setTransferType('deal')}
            >
              <span className="type-icon">🤝</span>
              <span className="type-label">{t('p2pTransferModal.typeDealLabel')}</span>
              <span className="type-description">{t('p2pTransferModal.typeDealDesc')}</span>
            </button>
          </div>
        </div>

        {/* Сумма */}
        <div className="form-group">
          <label>{t('p2pTransferModal.amountLabel')}</label>
          <input
            type="number"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder={t('p2pTransferModal.amountPlaceholder')}
            className="form-input"
            min="1"
            max="100"
          />
          <div className="form-hint">
            {t('p2pTransferModal.maxNote')}
          </div>
        </div>

        {/* Для DEAL: описание */}
        {transferType === 'deal' && (
          <div className="form-group">
            <label>{t('p2pTransferModal.dealTaskLabel')}</label>
            <textarea
              value={dealDescription}
              onChange={(e) => setDealDescription(e.target.value)}
              placeholder={t('p2pTransferModal.dealTaskPlaceholder')}
              className="form-textarea"
              rows={3}
            />
            <div className="deal-preview">
              <strong>{t('p2pTransferModal.dealSummaryTitle')}</strong>
              <p>
                {toChildName}: &ldquo;{dealDescription || '...'}&rdquo;
                <br />
                {fromChildName}: {amount} 💰
              </p>
            </div>
          </div>
        )}

        {/* Для LOAN: проценты и срок */}
        {transferType === 'loan' && (
          <>
            <div className="form-group">
              <label>{t('p2pTransferModal.loanInterestLabel')}</label>
              <input
                type="number"
                value={loanInterest || ''}
                onChange={(e) => setLoanInterest(Number(e.target.value))}
                placeholder={t('p2pTransferModal.loanInterestPlaceholder')}
                className="form-input"
                min="0"
                max="50"
              />
              <div className="form-hint">
                {t('p2pTransferModal.loanInterestHint')}
              </div>
            </div>

            <div className="form-group">
              <label>{t('p2pTransferModal.loanTermLabel')}</label>
              <select
                value={loanDueDays}
                onChange={(e) => setLoanDueDays(Number(e.target.value))}
                className="form-select"
              >
                <option value="1">{t('p2pTransferModal.loanTerm1')}</option>
                <option value="3">{t('p2pTransferModal.loanTerm3')}</option>
                <option value="7">{t('p2pTransferModal.loanTerm7')}</option>
              </select>
            </div>

            <div className="loan-preview">
              <strong>{t('p2pTransferModal.loanSummaryTitle')}</strong>
              <p>
                {toChildName}: {amount} 💰
                <br />
                {totalLoanRepayment} 💰
                {loanInterest > 0 && ` (${t('p2pTransferModal.loanInterestPart', { interest: loanInterest })})`}
                <br />
                {loanDueDays} {t(loanDueDays === 1 ? 'p2pTransferModal.loanDay' : loanDueDays < 5 ? 'p2pTransferModal.loanFewDays' : 'p2pTransferModal.loanDays')}
              </p>
            </div>
          </>
        )}

        {/* Примечание */}
        <div className="form-group">
          <label>{t('p2pTransferModal.noteLabel')}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              transferType === 'gift' ? t('p2pTransferModal.notePlaceholderGift') :
              transferType === 'payment' ? t('p2pTransferModal.notePlaceholderPayment') :
              transferType === 'loan' ? t('p2pTransferModal.notePlaceholderLoan') :
              t('p2pTransferModal.notePlaceholderDeal')
            }
            className="form-input"
          />
        </div>

        {/* Предупреждения */}
        {amount > 100 && (
          <div className="warning-message">
            {t('p2pTransferModal.warningLargeAmount')}
          </div>
        )}

        {transferType === 'loan' && (
          <div className="info-message">
            {t('p2pTransferModal.infoLoan')}
          </div>
        )}

        {transferType === 'deal' && (
          <div className="info-message">
            {t('p2pTransferModal.infoDeal')}
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
            {t('p2pTransfer.cancel')}
          </button>
          <button
            className="button primary"
            onClick={handleSubmit}
            disabled={saving || amount <= 0 || (transferType === 'deal' && !dealDescription)}
          >
            {saving ? t('p2pTransferModal.sendingBtn') :
             transferType === 'deal' ? t('p2pTransferModal.createDealBtn') :
             transferType === 'loan' ? t('p2pTransferModal.lendBtn') :
             t('p2pTransferModal.sendBtn')}
          </button>
        </div>

        {/* Обучающая информация */}
        <div className="education-section">
          <h4>{t('p2pTransferModal.educationTitle')}</h4>
          <ul>
            {transferType === 'gift' && (
              <>
                <li>{t('p2pTransferModal.educationGiftGenerosity')}</li>
                <li>{t('p2pTransferModal.educationGiftJoy')}</li>
              </>
            )}
            {transferType === 'payment' && (
              <>
                <li>{t('p2pTransferModal.educationPaymentFairTrade')}</li>
                <li>{t('p2pTransferModal.educationPaymentAgreements')}</li>
              </>
            )}
            {transferType === 'loan' && (
              <>
                <li>{t('p2pTransferModal.educationLoanHowLoans')}</li>
                <li>{t('p2pTransferModal.educationLoanInterest')}</li>
                <li>{t('p2pTransferModal.educationLoanOnTime')}</li>
                <li>{t('p2pTransferModal.educationLoanTrust')}</li>
              </>
            )}
            {transferType === 'deal' && (
              <>
                <li>{t('p2pTransferModal.educationDealNegotiation')}</li>
                <li>{t('p2pTransferModal.educationDealContracts')}</li>
                <li>{t('p2pTransferModal.educationDealDelegation')}</li>
                <li>{t('p2pTransferModal.educationDealEntrepreneurship')}</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
