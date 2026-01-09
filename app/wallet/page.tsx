'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import WalletDashboard from '@/components/WalletDashboard'
import ExchangeModal from '@/components/ExchangeModal'
import ShopModal from '@/components/ShopModal'
import WithdrawModal from '@/components/WithdrawModal'
import { getTransactions, WalletTransaction } from '@/lib/wallet-api'

export default function WalletPage() {
  const [childId, setChildId] = useState('adam')
  const [showExchange, setShowExchange] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [childId, refreshKey])

  async function loadTransactions() {
    try {
      setLoading(true)
      const data = await getTransactions(childId, 10)
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

  function getChildName(id: string) {
    return id === 'adam' ? 'Адам' : 'Алим'
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

        {/* Выбор ребёнка */}
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="h3" style={{ marginBottom: '12px' }}>Чей кошелёк?</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={childId === 'adam' ? 'btn primary' : 'btn'}
              onClick={() => {
                setChildId('adam')
                localStorage.setItem('v4_selected_kid', 'adam')
              }}
            >
              👦 Адам
            </button>
            <button
              className={childId === 'alim' ? 'btn primary' : 'btn'}
              onClick={() => {
                setChildId('alim')
                localStorage.setItem('v4_selected_kid', 'alim')
              }}
            >
              👶 Алим
            </button>
          </div>
        </div>

        {/* Dashboard с балансами */}
        <div style={{ marginTop: '24px' }}>
          <WalletDashboard key={`${childId}-${refreshKey}`} childId={childId} />
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
        childId={childId}
        onSuccess={handleSuccess}
      />

      <ShopModal
        isOpen={showShop}
        onClose={() => setShowShop(false)}
        childId={childId}
        onSuccess={handleSuccess}
      />

      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        childId={childId}
        onSuccess={handleSuccess}
      />
    </>
  )
}
