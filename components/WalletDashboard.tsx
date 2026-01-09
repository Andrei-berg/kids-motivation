'use client'

import { useState, useEffect } from 'react'
import { getWallet, Wallet } from '@/lib/wallet-api'

interface WalletDashboardProps {
  childId: string
}

export default function WalletDashboard({ childId }: WalletDashboardProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWallet()
  }, [childId])

  async function loadWallet() {
    try {
      setLoading(true)
      const data = await getWallet(childId)
      setWallet(data)
    } catch (err) {
      console.error('Error loading wallet:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="wallet-dashboard-loading">
        <div className="wallet-skeleton"></div>
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="wallet-dashboard-error">
        <div className="wallet-error-icon">⚠️</div>
        <div>Кошелёк не найден</div>
      </div>
    )
  }

  return (
    <div className="wallet-dashboard">
      {/* Карточка монет */}
      <div className="wallet-card wallet-card-coins">
        <div className="wallet-card-header">
          <div className="wallet-card-icon">💰</div>
          <div className="wallet-card-label">Монеты</div>
        </div>
        <div className="wallet-card-amount">{wallet.coins.toLocaleString('ru-RU')}</div>
        <div className="wallet-card-footer">
          <div className="wallet-card-stat">
            <span className="wallet-card-stat-label">Заработано</span>
            <span className="wallet-card-stat-value">{wallet.total_earned_coins.toLocaleString('ru-RU')}</span>
          </div>
          <div className="wallet-card-stat">
            <span className="wallet-card-stat-label">Потрачено</span>
            <span className="wallet-card-stat-value">{wallet.total_spent_coins.toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* Карточка денег */}
      <div className="wallet-card wallet-card-money">
        <div className="wallet-card-header">
          <div className="wallet-card-icon">💵</div>
          <div className="wallet-card-label">Карманные деньги</div>
        </div>
        <div className="wallet-card-amount">
          {Number(wallet.money).toLocaleString('ru-RU')} ₽
        </div>
        <div className="wallet-card-footer">
          <div className="wallet-card-stat">
            <span className="wallet-card-stat-label">Получено</span>
            <span className="wallet-card-stat-value">
              {Number(wallet.total_earned_money).toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="wallet-card-stat">
            <span className="wallet-card-stat-label">Потрачено</span>
            <span className="wallet-card-stat-value">
              {Number(wallet.total_spent_money).toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Карточка обмена */}
      <div className="wallet-card wallet-card-exchange">
        <div className="wallet-card-header">
          <div className="wallet-card-icon">💱</div>
          <div className="wallet-card-label">Обменяно</div>
        </div>
        <div className="wallet-card-amount-small">
          {wallet.total_exchanged_coins.toLocaleString('ru-RU')} монет
        </div>
        <div className="wallet-card-hint">
          Обменял монеты на карманные деньги
        </div>
      </div>
    </div>
  )
}
