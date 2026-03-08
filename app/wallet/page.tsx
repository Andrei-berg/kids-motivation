'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import WalletDashboard from '@/components/WalletDashboard'
import ExchangeModal from '@/components/ExchangeModal'
import ShopModal from '@/components/ShopModal'
import WithdrawModal from '@/components/WithdrawModal'
import P2PTransferModal from '@/components/P2PTransferModal'
import { getTransactions, WalletTransaction } from '@/lib/wallet-api'
import { useAppStore } from '@/lib/store'
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'

export default function WalletPage() {
  const { activeMemberId } = useAppStore()
  const { members } = useFamilyMembers()
  const [showExchange, setShowExchange] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showP2P, setShowP2P] = useState(false)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Derive siblings for P2P — no hardcoded names
  const siblings = members.filter(m => m.id !== activeMemberId)
  // Auto-select single sibling; if 0 siblings hide P2P; if 2+ show TODO dropdown
  const p2pRecipient = siblings.length === 1 ? siblings[0] : null

  useEffect(() => {
    if (!activeMemberId) return
    loadTransactions()
  }, [activeMemberId, refreshKey])

  async function loadTransactions() {
    if (!activeMemberId) return
    try {
      setLoading(true)
      const data = await getTransactions(activeMemberId!, 10)
      setTransactions(data)
    } catch (err) {
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSuccess() {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <>
      <NavBar />
      <div className="wrap">
        {/* Заголовок */}
        <div className="card">
          <div className="h1">💰 Мой кошелёк</div>
          <div className="muted">Управляй своими монетами и деньгами</div>
        </div>

        {/* Dashboard с балансами */}
        <div style={{ marginTop: '24px' }}>
          <WalletDashboard key={`${activeMemberId}-${refreshKey}`} childId={activeMemberId ?? ''} />
        </div>

        {/* Быстрые действия */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="h2" style={{ marginBottom: '16px' }}>⚡ Быстрые действия</div>
          <div className="wallet-actions">
            <button
              className="wallet-action-btn wallet-action-exchange"
              onClick={() => setShowExchange(true)}
            >
              <span className="wallet-action-icon">💱</span>
              <span className="wallet-action-label">Обменять монеты</span>
              <span className="wallet-action-hint">Монеты → Деньги</span>
            </button>

            <button
              className="wallet-action-btn wallet-action-shop"
              onClick={() => setShowShop(true)}
            >
              <span className="wallet-action-icon">🏪</span>
              <span className="wallet-action-label">Магазин</span>
              <span className="wallet-action-hint">Купить награды</span>
            </button>

            <button
              className="wallet-action-btn wallet-action-withdraw"
              onClick={() => setShowWithdraw(true)}
            >
              <span className="wallet-action-icon">💵</span>
              <span className="wallet-action-label">Вывести деньги</span>
              <span className="wallet-action-hint">Получить наличными</span>
            </button>

            {/* P2P button: hidden when no siblings, shown when 1 sibling */}
            {siblings.length > 0 && (
              <button
                className="wallet-action-btn wallet-action-p2p"
                onClick={() => setShowP2P(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                <span className="wallet-action-icon">💸</span>
                <span className="wallet-action-label">
                  {p2pRecipient
                    ? `Перевести ${p2pRecipient.display_name}`
                    : 'Перевести'}
                </span>
                <span className="wallet-action-hint">Подарок, займ, сделка</span>
              </button>
            )}
          </div>
        </div>

        {/* История транзакций */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="h2" style={{ marginBottom: '16px' }}>📜 История операций</div>

          {loading ? (
            <div className="wallet-history-loading">Загрузка...</div>
          ) : transactions.length === 0 ? (
            <div className="wallet-history-empty">
              <div className="wallet-history-empty-icon">📭</div>
              <div className="wallet-history-empty-text">Пока нет операций</div>
              <div className="wallet-history-empty-hint">
                Зарабатывай монеты за оценки и спорт!
              </div>
            </div>
          ) : (
            <div className="wallet-history">
              {transactions.map(t => (
                <div key={t.id} className="wallet-history-item">
                  <div className="wallet-history-icon">{t.icon}</div>
                  <div className="wallet-history-content">
                    <div className="wallet-history-description">{t.description}</div>
                    <div className="wallet-history-date">
                      {new Date(t.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="wallet-history-changes">
                    {t.coins_change !== 0 && (
                      <div className={`wallet-history-change ${t.coins_change > 0 ? 'positive' : 'negative'}`}>
                        {t.coins_change > 0 ? '+' : ''}{t.coins_change} 💰
                      </div>
                    )}
                    {t.money_change !== 0 && (
                      <div className={`wallet-history-change ${t.money_change > 0 ? 'positive' : 'negative'}`}>
                        {t.money_change > 0 ? '+' : ''}{Number(t.money_change).toFixed(0)}₽
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Подсказки */}
        <div className="card" style={{ marginTop: '24px', background: 'var(--blue-50)' }}>
          <div className="h3" style={{ marginBottom: '12px' }}>💡 Как зарабатывать монеты?</div>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>Получай оценки 5 → <strong>10 монет</strong></li>
            <li style={{ marginBottom: '8px' }}>Получай оценки 4 → <strong>5 монет</strong></li>
            <li style={{ marginBottom: '8px' }}>Убирай комнату → <strong>3 монеты за задание</strong></li>
            <li style={{ marginBottom: '8px' }}>Хорошее поведение → <strong>5 монет</strong></li>
            <li style={{ marginBottom: '8px' }}>Делай спорт → <strong>5 монет за упражнение</strong></li>
          </ul>
        </div>
      </div>

      {/* Модалки */}
      <ExchangeModal
        isOpen={showExchange}
        onClose={() => setShowExchange(false)}
        childId={activeMemberId ?? ''}
        onSuccess={handleSuccess}
      />

      <ShopModal
        isOpen={showShop}
        onClose={() => setShowShop(false)}
        childId={activeMemberId ?? ''}
        onSuccess={handleSuccess}
      />

      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        childId={activeMemberId ?? ''}
        onSuccess={handleSuccess}
      />

      {/* P2P modal: only show when 1 sibling (auto-selected recipient) */}
      {showP2P && p2pRecipient && (
        <P2PTransferModal
          fromChildId={activeMemberId ?? ''}
          toChildId={p2pRecipient.id}
          fromChildName={''}
          toChildName={p2pRecipient.display_name}
          onClose={() => setShowP2P(false)}
          onSuccess={handleSuccess}
        />
      )}
      {/* TODO: siblings.length >= 2 — show sibling selector dropdown before P2P modal */}
    </>
  )
}
