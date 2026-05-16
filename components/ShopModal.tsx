'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'
import {
  getRewards,
  getWallet,
  purchaseReward,
  Reward,
  Wallet
} from '@/lib/wallet-api'
import { triggerConfetti } from '@/utils/confetti'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  onSuccess: () => void
}

type Tab = 'coins' | 'money'

export default function ShopModal({ isOpen, onClose, childId, onSuccess }: ShopModalProps) {
  const t = useT()
  const [tab, setTab] = useState<Tab>('coins')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, childId])

  async function loadData() {
    try {
      setLoading(true)
      const [rewardsData, walletData] = await Promise.all([
        getRewards({ childId, activeOnly: true }),
        getWallet(childId)
      ])
      setRewards(rewardsData)
      setWallet(walletData)
    } catch (err) {
      console.error('Error loading shop data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePurchase(reward: Reward) {
    if (purchasing) return

    // Проверить баланс
    if (reward.reward_type === 'coins') {
      if ((wallet?.coins || 0) < (reward.price_coins || 0)) {
        alert(t('shopModal.insufficientCoins'))
        return
      }
    } else {
      if (Number(wallet?.money || 0) < Number(reward.price_money || 0)) {
        alert(t('shopModal.insufficientMoney'))
        return
      }
    }

    const confirmText = reward.reward_type === 'coins'
      ? t('shopModal.buyCoinsConfirm', { title: reward.title, price: reward.price_coins ?? 0 })
      : t('shopModal.buyMoneyConfirm', { title: reward.title, price: Number(reward.price_money).toLocaleString('ru-RU') })

    if (!confirm(confirmText)) return

    try {
      setPurchasing(reward.id)
      await purchaseReward(childId, reward.id)

      triggerConfetti()
      alert(t('shopModal.bought', { title: reward.title }))

      onSuccess()
      await loadData()
    } catch (err: any) {
      console.error('Error purchasing reward:', err)
      alert(err.message || t('shopModal.buyError'))
    } finally {
      setPurchasing(null)
    }
  }

  if (!isOpen) return null

  const coinsRewards = rewards.filter(r => r.reward_type === 'coins')
  const moneyRewards = rewards.filter(r => r.reward_type === 'money')
  const currentRewards = tab === 'coins' ? coinsRewards : moneyRewards

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shop-modal-header">
          <h2 className="shop-modal-title">{t('shopModal.title')}</h2>
          <button
            className="shop-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="shop-modal-body">
          {/* Balance */}
          <div className="shop-balance">
            <div className="shop-balance-item">
              <span className="shop-balance-label">{t('shopModal.coinsLabel')}</span>
              <span className="shop-balance-value">{wallet?.coins || 0}</span>
            </div>
            <div className="shop-balance-item">
              <span className="shop-balance-label">{t('shopModal.moneyLabel')}</span>
              <span className="shop-balance-value">
                {Number(wallet?.money || 0).toLocaleString('ru-RU')}₽
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="shop-tabs">
            <button
              className={`shop-tab ${tab === 'coins' ? 'active' : ''}`}
              onClick={() => setTab('coins')}
            >
              <span className="shop-tab-icon">💰</span>
              <span>{t('shopModal.forCoins')}</span>
              <span className="shop-tab-badge">{coinsRewards.length}</span>
            </button>
            <button
              className={`shop-tab ${tab === 'money' ? 'active' : ''}`}
              onClick={() => setTab('money')}
            >
              <span className="shop-tab-icon">💵</span>
              <span>{t('shopModal.forMoney')}</span>
              <span className="shop-tab-badge">{moneyRewards.length}</span>
            </button>
          </div>

          {/* Rewards Grid */}
          <div className="shop-rewards-grid">
            {loading ? (
              <div className="shop-loading">{t('shopModal.loading')}</div>
            ) : currentRewards.length === 0 ? (
              <div className="shop-empty">
                <div className="shop-empty-icon">📦</div>
                <div className="shop-empty-text">
                  {tab === 'coins'
                    ? t('shopModal.noCoinsRewards')
                    : t('shopModal.noMoneyRewards')}
                </div>
              </div>
            ) : (
              currentRewards.map(reward => {
                const canAfford = reward.reward_type === 'coins'
                  ? (wallet?.coins || 0) >= (reward.price_coins || 0)
                  : Number(wallet?.money || 0) >= Number(reward.price_money || 0)

                const progress = reward.reward_type === 'coins'
                  ? Math.min(100, ((wallet?.coins || 0) / (reward.price_coins || 1)) * 100)
                  : Math.min(100, (Number(wallet?.money || 0) / Number(reward.price_money || 1)) * 100)

                return (
                  <div key={reward.id} className={`shop-reward-card ${canAfford ? 'affordable' : ''}`}>
                    <div className="shop-reward-icon">{reward.icon}</div>
                    <div className="shop-reward-content">
                      <h3 className="shop-reward-title">{reward.title}</h3>
                      {reward.description && (
                        <p className="shop-reward-description">{reward.description}</p>
                      )}

                      <div className="shop-reward-price">
                        {reward.reward_type === 'coins' ? (
                          <>💰 {reward.price_coins}</>
                        ) : (
                          <>💵 {Number(reward.price_money).toLocaleString('ru-RU')}₽</>
                        )}
                      </div>

                      {!canAfford && (
                        <div className="shop-reward-progress">
                          <div className="shop-reward-progress-bar">
                            <div
                              className="shop-reward-progress-fill"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="shop-reward-progress-text">
                            {progress.toFixed(0)}%
                          </div>
                        </div>
                      )}

                      <button
                        className={`shop-reward-btn ${canAfford ? 'shop-reward-btn-buy' : 'shop-reward-btn-save'}`}
                        onClick={() => handlePurchase(reward)}
                        disabled={!canAfford || purchasing === reward.id}
                      >
                        {purchasing === reward.id ? (
                          '⏳'
                        ) : canAfford ? (
                          '🛒'
                        ) : reward.reward_type === 'coins' ? (
                          `${(reward.price_coins || 0) - (wallet?.coins || 0)}`
                        ) : (
                          `${(Number(reward.price_money || 0) - Number(wallet?.money || 0)).toLocaleString('ru-RU')}₽`
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
