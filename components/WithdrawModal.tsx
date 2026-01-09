'use client'

import { useState, useEffect } from 'react'
import { 
  getWallet, 
  requestWithdrawal,
  getWithdrawals,
  Wallet,
  CashWithdrawal
} from '@/lib/wallet-api'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  onSuccess: () => void
}

export default function WithdrawModal({ isOpen, onClose, childId, onSuccess }: WithdrawModalProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [amount, setAmount] = useState('')
  const [withdrawals, setWithdrawals] = useState<CashWithdrawal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadData()
    } else {
      resetForm()
    }
  }, [isOpen, childId])

  async function loadData() {
    try {
      const [walletData, withdrawalsData] = await Promise.all([
        getWallet(childId),
        getWithdrawals(childId)
      ])
      setWallet(walletData)
      setWithdrawals(withdrawalsData)
    } catch (err) {
      console.error('Error loading withdraw data:', err)
    }
  }

  function resetForm() {
    setAmount('')
    setError('')
  }

  const withdrawAmount = Number(amount) || 0
  const canWithdraw = withdrawAmount > 0 && withdrawAmount <= Number(wallet?.money || 0)
  const remainingMoney = Number(wallet?.money || 0) - withdrawAmount

  async function handleWithdraw() {
    if (!canWithdraw) {
      setError('Недостаточно денег')
      return
    }

    if (!confirm(`Вывести ${withdrawAmount.toLocaleString('ru-RU')}₽ наличными?`)) {
      return
    }

    try {
      setLoading(true)
      setError('')

      await requestWithdrawal(childId, withdrawAmount)

      alert('✅ Заявка на вывод отправлена!\n\nРодитель скоро одобрит и даст деньги. 😊')
      
      onSuccess()
      await loadData()
      resetForm()
    } catch (err: any) {
      console.error('Error requesting withdrawal:', err)
      setError(err.message || 'Ошибка вывода')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending')
  const completedWithdrawals = withdrawals.filter(w => w.status !== 'pending').slice(0, 5)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="withdraw-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="withdraw-modal-header">
          <h2 className="withdraw-modal-title">💵 Вывести деньги</h2>
          <button 
            className="withdraw-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="withdraw-modal-body">
          {/* Баланс */}
          <div className="withdraw-balance">
            <div className="withdraw-balance-label">Доступно</div>
            <div className="withdraw-balance-value">
              {Number(wallet?.money || 0).toLocaleString('ru-RU')} ₽
            </div>
          </div>

          {/* Форма вывода */}
          <div className="withdraw-form">
            <div className="withdraw-form-group">
              <label className="withdraw-form-label">
                Сколько вывести?
              </label>
              <div className="withdraw-input-wrapper">
                <input
                  type="number"
                  className="withdraw-input"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  max={Number(wallet?.money || 0)}
                  disabled={loading}
                />
                <span className="withdraw-input-suffix">₽</span>
              </div>

              {/* Быстрые кнопки */}
              <div className="withdraw-quick-buttons">
                <button
                  className="withdraw-quick-btn"
                  onClick={() => setAmount('100')}
                  disabled={loading || Number(wallet?.money || 0) < 100}
                >
                  100₽
                </button>
                <button
                  className="withdraw-quick-btn"
                  onClick={() => setAmount('500')}
                  disabled={loading || Number(wallet?.money || 0) < 500}
                >
                  500₽
                </button>
                <button
                  className="withdraw-quick-btn"
                  onClick={() => setAmount('1000')}
                  disabled={loading || Number(wallet?.money || 0) < 1000}
                >
                  1,000₽
                </button>
                <button
                  className="withdraw-quick-btn withdraw-quick-btn-max"
                  onClick={() => setAmount(String(wallet?.money || 0))}
                  disabled={loading || Number(wallet?.money || 0) === 0}
                >
                  Всё
                </button>
              </div>
            </div>

            {/* Остаток */}
            {withdrawAmount > 0 && canWithdraw && (
              <div className="withdraw-preview">
                <div className="withdraw-preview-title">После вывода:</div>
                <div className="withdraw-preview-value">
                  Останется: {remainingMoney.toLocaleString('ru-RU')}₽
                </div>
              </div>
            )}

            {/* Подсказка */}
            <div className="withdraw-hint">
              💡 Родитель одобрит заявку и даст деньги наличными
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="withdraw-error">
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div className="withdraw-modal-footer">
            <button
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              className="btn-withdraw"
              onClick={handleWithdraw}
              disabled={loading || !canWithdraw}
            >
              {loading ? '💵 Отправляю...' : '💵 Вывести'}
            </button>
          </div>

          {/* Ожидающие заявки */}
          {pendingWithdrawals.length > 0 && (
            <div className="withdraw-pending">
              <div className="withdraw-pending-title">⏳ Ожидают одобрения:</div>
              {pendingWithdrawals.map(w => (
                <div key={w.id} className="withdraw-pending-item">
                  <span>{Number(w.amount).toLocaleString('ru-RU')}₽</span>
                  <span className="withdraw-pending-date">
                    {new Date(w.requested_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* История */}
          {completedWithdrawals.length > 0 && (
            <div className="withdraw-history">
              <div className="withdraw-history-title">📜 История выводов:</div>
              {completedWithdrawals.map(w => (
                <div key={w.id} className="withdraw-history-item">
                  <div className="withdraw-history-amount">
                    {Number(w.amount).toLocaleString('ru-RU')}₽
                  </div>
                  <div className="withdraw-history-meta">
                    <span className="withdraw-history-date">
                      {new Date(w.requested_at).toLocaleDateString('ru-RU')}
                    </span>
                    <span className={`withdraw-history-status withdraw-history-status-${w.status}`}>
                      {w.status === 'approved' ? '✅ Выдано' : '❌ Отклонено'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
