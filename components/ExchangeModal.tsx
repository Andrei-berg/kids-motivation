'use client'

import { useState, useEffect } from 'react'
import { 
  getWallet, 
  exchangeCoins, 
  calculateExchangeRate,
  Wallet 
} from '@/lib/wallet-api'
import { triggerConfetti } from '@/utils/confetti'

interface ExchangeModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  onSuccess: () => void
}

export default function ExchangeModal({ isOpen, onClose, childId, onSuccess }: ExchangeModalProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [coinsAmount, setCoinsAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState(10)
  const [bonus, setBonus] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadWallet()
    } else {
      resetForm()
    }
  }, [isOpen, childId])

  useEffect(() => {
    if (wallet && coinsAmount) {
      updateExchangeRate()
    }
  }, [wallet, coinsAmount])

  async function loadWallet() {
    try {
      const data = await getWallet(childId)
      setWallet(data)
    } catch (err) {
      console.error('Error loading wallet:', err)
      setError('Ошибка загрузки кошелька')
    }
  }

  async function updateExchangeRate() {
    if (!wallet) return
    try {
      const { rate, bonus: bonusPercent } = await calculateExchangeRate(wallet.coins)
      setExchangeRate(rate)
      setBonus(bonusPercent)
    } catch (err) {
      console.error('Error calculating rate:', err)
    }
  }

  function resetForm() {
    setCoinsAmount('')
    setError('')
    setLoading(false)
  }

  const coins = parseInt(coinsAmount) || 0
  const money = coins * exchangeRate
  const newCoins = (wallet?.coins || 0) - coins
  const newMoney = Number(wallet?.money || 0) + money

  const canExchange = coins > 0 && coins <= (wallet?.coins || 0)

  async function handleExchange() {
    if (!canExchange) {
      setError('Недостаточно монет')
      return
    }

    try {
      setLoading(true)
      setError('')

      await exchangeCoins(childId, coins)
      
      triggerConfetti()
      onSuccess()
      
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Error exchanging:', err)
      setError(err.message || 'Ошибка обмена')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="exchange-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="exchange-modal-header">
          <h2 className="exchange-modal-title">💱 Обменник монет</h2>
          <button 
            className="exchange-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="exchange-modal-body">
          {/* Текущий баланс */}
          <div className="exchange-balance">
            <div className="exchange-balance-item">
              <div className="exchange-balance-label">💰 Монеты</div>
              <div className="exchange-balance-value">
                {wallet?.coins.toLocaleString('ru-RU') || 0}
              </div>
            </div>
            <div className="exchange-balance-item">
              <div className="exchange-balance-label">💵 Деньги</div>
              <div className="exchange-balance-value">
                {Number(wallet?.money || 0).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Курс обмена */}
          <div className="exchange-rate-card">
            <div className="exchange-rate-title">📈 Текущий курс</div>
            <div className="exchange-rate-value">
              1 монета = {exchangeRate.toFixed(1)}₽
            </div>
            {bonus > 0 && (
              <div className="exchange-rate-bonus">
                🎉 Бонус +{bonus}% за накопление!
              </div>
            )}
            <div className="exchange-rate-hint">
              {wallet && wallet.coins < 100 && '💡 Копи монеты для лучшего курса!'}
              {wallet && wallet.coins >= 100 && wallet.coins < 500 && '⭐ Ещё 400 монет до бонуса +20%!'}
              {wallet && wallet.coins >= 500 && wallet.coins < 1000 && '⭐⭐ Ещё 500 монет до бонуса +50%!'}
              {wallet && wallet.coins >= 1000 && '🔥 Максимальный бонус +50%!'}
            </div>
          </div>

          {/* Форма обмена */}
          <div className="exchange-form">
            <div className="exchange-form-group">
              <label className="exchange-form-label">
                Сколько монет обменять?
              </label>
              <div className="exchange-input-wrapper">
                <input
                  type="number"
                  className="exchange-input"
                  placeholder="0"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(e.target.value)}
                  min="1"
                  max={wallet?.coins || 0}
                  disabled={loading}
                />
                <span className="exchange-input-suffix">монет</span>
              </div>

              {/* Быстрые кнопки */}
              <div className="exchange-quick-buttons">
                <button
                  className="exchange-quick-btn"
                  onClick={() => setCoinsAmount(String(Math.min(50, wallet?.coins || 0)))}
                  disabled={loading || !wallet || wallet.coins < 50}
                >
                  50
                </button>
                <button
                  className="exchange-quick-btn"
                  onClick={() => setCoinsAmount(String(Math.min(100, wallet?.coins || 0)))}
                  disabled={loading || !wallet || wallet.coins < 100}
                >
                  100
                </button>
                <button
                  className="exchange-quick-btn"
                  onClick={() => setCoinsAmount(String(Math.min(500, wallet?.coins || 0)))}
                  disabled={loading || !wallet || wallet.coins < 500}
                >
                  500
                </button>
                <button
                  className="exchange-quick-btn exchange-quick-btn-max"
                  onClick={() => setCoinsAmount(String(wallet?.coins || 0))}
                  disabled={loading || !wallet || wallet.coins === 0}
                >
                  Всё
                </button>
              </div>
            </div>

            {/* Результат обмена */}
            {coins > 0 && (
              <div className="exchange-result">
                <div className="exchange-result-arrow">↓</div>
                <div className="exchange-result-amount">
                  Получишь: <span className="exchange-result-money">{money.toFixed(0)}₽</span>
                </div>
              </div>
            )}

            {/* Баланс после обмена */}
            {coins > 0 && canExchange && (
              <div className="exchange-preview">
                <div className="exchange-preview-title">После обмена:</div>
                <div className="exchange-preview-items">
                  <div className="exchange-preview-item">
                    <span>💰 Монеты:</span>
                    <span className="exchange-preview-value">
                      {wallet?.coins} → {newCoins}
                    </span>
                  </div>
                  <div className="exchange-preview-item">
                    <span>💵 Деньги:</span>
                    <span className="exchange-preview-value exchange-preview-value-positive">
                      {Number(wallet?.money || 0).toFixed(0)}₽ → {newMoney.toFixed(0)}₽
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="exchange-error">
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div className="exchange-modal-footer">
            <button
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              className="btn-exchange"
              onClick={handleExchange}
              disabled={loading || !canExchange}
            >
              {loading ? '💱 Обмениваю...' : '💱 Обменять'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
