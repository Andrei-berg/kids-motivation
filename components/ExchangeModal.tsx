'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'
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
  const t = useT()
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
      setError(t('exchangeModal.loading'))
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
      setError(t('exchangeModal.insufficientCoins'))
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
      setError(err.message || t('exchangeModal.error'))
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
          <h2 className="exchange-modal-title">{t('exchangeModal.title')}</h2>
          <button
            className="exchange-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="exchange-modal-body">
          {/* Balance */}
          <div className="exchange-balance">
            <div className="exchange-balance-item">
              <div className="exchange-balance-label">{t('exchangeModal.coinsLabel')}</div>
              <div className="exchange-balance-value">
                {wallet?.coins.toLocaleString('ru-RU') || 0}
              </div>
            </div>
            <div className="exchange-balance-item">
              <div className="exchange-balance-label">{t('exchangeModal.moneyLabel')}</div>
              <div className="exchange-balance-value">
                {Number(wallet?.money || 0).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="exchange-rate-card">
            <div className="exchange-rate-title">{t('exchangeModal.rateTitle')}</div>
            <div className="exchange-rate-value">
              {t('exchangeModal.rate', { rate: exchangeRate.toFixed(1) })}
            </div>
            {bonus > 0 && (
              <div className="exchange-rate-bonus">
                {t('exchangeModal.bonus', { pct: bonus })}
              </div>
            )}
            <div className="exchange-rate-hint">
              {wallet && wallet.coins < 100 && t('exchangeModal.tip100')}
              {wallet && wallet.coins >= 100 && wallet.coins < 500 && t('exchangeModal.tip500', { amount: 500 - wallet.coins })}
              {wallet && wallet.coins >= 500 && wallet.coins < 1000 && t('exchangeModal.tip1000', { amount: 1000 - wallet.coins })}
              {wallet && wallet.coins >= 1000 && t('exchangeModal.tipMax')}
            </div>
          </div>

          {/* Exchange Form */}
          <div className="exchange-form">
            <div className="exchange-form-group">
              <label className="exchange-form-label">
                {t('exchangeModalExtra.howManyCoins')}
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
                <span className="exchange-input-suffix">{t('exchangeModalExtra.coinsSuffix')}</span>
              </div>

              {/* Quick buttons */}
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
                  {t('exchangeModalExtra.allBtn')}
                </button>
              </div>
            </div>

            {/* Exchange result */}
            {coins > 0 && (
              <div className="exchange-result">
                <div className="exchange-result-arrow">↓</div>
                <div className="exchange-result-amount">
                  {t('exchangeModalExtra.youGet')}<span className="exchange-result-money">{money.toFixed(0)}₽</span>
                </div>
              </div>
            )}

            {/* Balance after exchange */}
            {coins > 0 && canExchange && (
              <div className="exchange-preview">
                <div className="exchange-preview-title">{t('exchangeModalExtra.afterExchange')}</div>
                <div className="exchange-preview-items">
                  <div className="exchange-preview-item">
                    <span>{t('exchangeModalExtra.coinsAfter')}</span>
                    <span className="exchange-preview-value">
                      {wallet?.coins} → {newCoins}
                    </span>
                  </div>
                  <div className="exchange-preview-item">
                    <span>{t('exchangeModalExtra.moneyAfter')}</span>
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
              {t('exchangeModal.cancel')}
            </button>
            <button
              className="btn-exchange"
              onClick={handleExchange}
              disabled={loading || !canExchange}
            >
              {loading ? t('exchangeModalExtra.exchangingBtn') : t('exchangeModalExtra.exchangeBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
