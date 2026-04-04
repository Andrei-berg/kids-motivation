'use client'

import { useEffect, useState } from 'react'
import { getChildren } from '@/lib/repositories/children.repo'
import {
  getWallet,
  getTransactions,
  getWalletSettings,
  updateWalletCoins,
  createP2PTransfer,
  exchangeCoins,
  requestWithdrawal,
  getWithdrawals,
} from '@/lib/repositories/wallet.repo'
import type { Child } from '@/lib/models/child.types'
import type { Wallet, WalletTransaction, WalletSettings, CashWithdrawal } from '@/lib/models/wallet.types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

function SkeletonCard() {
  return <div className="animate-pulse bg-gray-700 rounded-xl h-32 mt-4" />
}

export default function WalletsPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [walletSettings, setWalletSettings] = useState<WalletSettings | null>(null)

  // Manual adjustment state
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState(false)
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // P2P transfer state
  const [p2pToChildId, setP2pToChildId] = useState('')
  const [p2pAmount, setP2pAmount] = useState('')
  const [p2pError, setP2pError] = useState('')
  const [p2pSuccess, setP2pSuccess] = useState(false)
  const [p2pSubmitting, setP2pSubmitting] = useState(false)

  // Exchange state
  const [exchangeExpanded, setExchangeExpanded] = useState(false)
  const [exchangeCoinsInput, setExchangeCoinsInput] = useState('')
  const [exchangeError, setExchangeError] = useState('')
  const [exchangeSuccess, setExchangeSuccess] = useState(false)
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false)

  // Withdrawal state
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalError, setWithdrawalError] = useState('')
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false)
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)
  const [pendingWithdrawals, setPendingWithdrawals] = useState<CashWithdrawal[]>([])
  const [approvedWithdrawals, setApprovedWithdrawals] = useState<CashWithdrawal[]>([])

  // Load children and settings on mount
  useEffect(() => {
    async function init() {
      const [kids, settings] = await Promise.all([
        getChildren(),
        getWalletSettings(),
      ])
      setChildren(kids)
      setWalletSettings(settings)
      if (kids.length > 0) {
        setSelectedChildId(kids[0].id)
        const otherKids = kids.filter(k => k.id !== kids[0].id)
        if (otherKids.length > 0) setP2pToChildId(otherKids[0].id)
      }
    }
    init()
  }, [])

  // Load wallet data when selected child changes
  useEffect(() => {
    if (!selectedChildId) return
    loadChildData(selectedChildId)
  }, [selectedChildId])

  async function loadChildData(childId: string) {
    setLoading(true)
    try {
      const [w, txs, pending, approved] = await Promise.all([
        getWallet(childId),
        getTransactions(childId, 50),
        getWithdrawals(childId, 'pending'),
        getWithdrawals(childId, 'approved'),
      ])
      setWallet(w)
      setTransactions(txs)
      setPendingWithdrawals(pending)
      setApprovedWithdrawals(approved.slice(0, 5))
    } finally {
      setLoading(false)
    }
  }

  async function refreshWalletAndTransactions() {
    if (!selectedChildId) return
    const [w, txs] = await Promise.all([
      getWallet(selectedChildId),
      getTransactions(selectedChildId, 50),
    ])
    setWallet(w)
    setTransactions(txs)
  }

  async function refreshWithdrawals() {
    if (!selectedChildId) return
    const [pending, approved] = await Promise.all([
      getWithdrawals(selectedChildId, 'pending'),
      getWithdrawals(selectedChildId, 'approved'),
    ])
    setPendingWithdrawals(pending)
    setApprovedWithdrawals(approved.slice(0, 5))
  }

  // Tab switch
  function handleTabSwitch(childId: string) {
    setSelectedChildId(childId)
    const otherKids = children.filter(k => k.id !== childId)
    if (otherKids.length > 0) setP2pToChildId(otherKids[0].id)
    // reset form states
    setAdjustAmount('')
    setAdjustReason('')
    setAdjustError('')
    setAdjustSuccess(false)
    setP2pAmount('')
    setP2pError('')
    setP2pSuccess(false)
    setExchangeCoinsInput('')
    setExchangeError('')
    setExchangeSuccess(false)
    setWithdrawalAmount('')
    setWithdrawalError('')
    setWithdrawalSuccess(false)
  }

  // Manual adjustment
  async function handleAdjustSubmit() {
    setAdjustError('')
    const amount = Number(adjustAmount)
    if (!adjustAmount || amount === 0) {
      setAdjustError('Введите ненулевую сумму')
      return
    }
    if (!adjustReason.trim()) {
      setAdjustError('Причина обязательна')
      return
    }
    if (!selectedChildId) return
    setAdjustSubmitting(true)
    try {
      await updateWalletCoins(
        selectedChildId,
        amount,
        adjustReason.trim(),
        amount > 0 ? '🎁' : '⚠️'
      )
      await refreshWalletAndTransactions()
      setAdjustAmount('')
      setAdjustReason('')
      setAdjustSuccess(true)
      setTimeout(() => setAdjustSuccess(false), 2000)
    } catch (e: unknown) {
      setAdjustError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // P2P transfer
  async function handleP2PSubmit() {
    setP2pError('')
    const amount = Number(p2pAmount)
    if (!p2pAmount || amount < 1) {
      setP2pError('Введите сумму не менее 1')
      return
    }
    if (!selectedChildId || !p2pToChildId) return
    setP2pSubmitting(true)
    try {
      await createP2PTransfer({
        from_child_id: selectedChildId,
        to_child_id: p2pToChildId,
        amount,
        transfer_type: 'gift',
        note: 'Перевод от родителя',
      })
      await refreshWalletAndTransactions()
      setP2pAmount('')
      setP2pSuccess(true)
      setTimeout(() => setP2pSuccess(false), 2000)
    } catch (e: unknown) {
      setP2pError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setP2pSubmitting(false)
    }
  }

  // Exchange coins
  async function handleExchangeSubmit() {
    setExchangeError('')
    const coins = Number(exchangeCoinsInput)
    if (!exchangeCoinsInput || coins < 1) {
      setExchangeError('Введите количество монет')
      return
    }
    if (!selectedChildId) return
    setExchangeSubmitting(true)
    try {
      await exchangeCoins(selectedChildId, coins)
      await refreshWalletAndTransactions()
      setExchangeCoinsInput('')
      setExchangeSuccess(true)
      setTimeout(() => setExchangeSuccess(false), 2000)
    } catch (e: unknown) {
      setExchangeError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setExchangeSubmitting(false)
    }
  }

  // Withdrawal request
  async function handleWithdrawalSubmit() {
    setWithdrawalError('')
    const amount = Number(withdrawalAmount)
    if (!withdrawalAmount || amount <= 0) {
      setWithdrawalError('Введите сумму больше 0')
      return
    }
    if (!selectedChildId) return
    setWithdrawalSubmitting(true)
    try {
      await requestWithdrawal(selectedChildId, amount)
      setWithdrawalAmount('')
      await refreshWithdrawals()
      setWithdrawalSuccess(true)
      setTimeout(() => setWithdrawalSuccess(false), 2000)
    } catch (e: unknown) {
      setWithdrawalError(e instanceof Error ? e.message : 'Недостаточно средств')
    } finally {
      setWithdrawalSubmitting(false)
    }
  }

  const exchangeRate = walletSettings ? walletSettings.base_exchange_rate / 100 : 0
  const exchangePreview = exchangeCoinsInput
    ? (Number(exchangeCoinsInput) * exchangeRate).toFixed(2)
    : null

  const otherChildren = children.filter(c => c.id !== selectedChildId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Кошельки</h1>

      {/* Child tab bar */}
      <div className="flex gap-2 flex-wrap">
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => handleTabSwitch(child.id)}
            className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedChildId === child.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {child.emoji} {child.name}
          </button>
        ))}
      </div>

      {/* Balance card */}
      {loading ? (
        <SkeletonCard />
      ) : wallet ? (
        <div className="bg-gray-800 rounded-xl p-5 mt-4">
          <div className="text-4xl font-bold text-yellow-400 mb-1">
            💰 {wallet.coins}
          </div>
          <div className="text-lg text-gray-300 mb-4">
            💵 {Number(wallet.money).toFixed(2)} руб
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Заработано монет</div>
              <div className="text-green-400 font-semibold">{wallet.total_earned_coins}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Потрачено монет</div>
              <div className="text-red-400 font-semibold">{wallet.total_spent_coins}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Заработано руб</div>
              <div className="text-green-400 font-semibold">{Number(wallet.total_earned_money).toFixed(2)}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Потрачено руб</div>
              <div className="text-red-400 font-semibold">{Number(wallet.total_spent_money).toFixed(2)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-5 mt-4 text-gray-400 text-sm">
          Кошелёк не найден
        </div>
      )}

      {/* Transaction history */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-3">История транзакций</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Транзакций пока нет</p>
        ) : (
          <div className="bg-gray-800 rounded-xl divide-y divide-gray-700">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{tx.icon || '💰'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{tx.description}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatDate(tx.created_at)}</div>
                </div>
                <div className={`text-sm font-semibold whitespace-nowrap ${
                  tx.coins_change > 0 ? 'text-green-400' : tx.coins_change < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {tx.coins_change > 0 ? '+' : ''}{tx.coins_change !== 0 ? `${tx.coins_change} 💰` : `${tx.money_change > 0 ? '+' : ''}${tx.money_change} руб`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel 1: Manual Adjustment */}
      <div className="bg-gray-800 rounded-xl p-4 mt-4">
        <h2 className="text-base font-semibold text-white mb-3">Бонус / Штраф</h2>
        <div className="flex flex-col gap-2">
          <input
            type="number"
            value={adjustAmount}
            onChange={e => setAdjustAmount(e.target.value)}
            placeholder="Сумма (отрицательная = штраф)"
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
            placeholder="Причина"
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {adjustError && <p className="text-red-400 text-xs">{adjustError}</p>}
          {adjustSuccess && <p className="text-green-400 text-xs">Изменение применено</p>}
          <button
            onClick={handleAdjustSubmit}
            disabled={adjustSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {adjustSubmitting ? '...' : 'Применить'}
          </button>
        </div>
      </div>

      {/* Panel 2: P2P Transfer (only if 2+ children) */}
      {children.length >= 2 && (
        <div className="bg-gray-800 rounded-xl p-4 mt-4">
          <h2 className="text-base font-semibold text-white mb-3">Перевод между детьми</h2>
          <div className="flex flex-col gap-2">
            <select
              value={p2pToChildId}
              onChange={e => setP2pToChildId(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {otherChildren.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={p2pAmount}
              onChange={e => setP2pAmount(e.target.value)}
              placeholder="Количество монет"
              min={1}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {p2pError && <p className="text-red-400 text-xs">{p2pError}</p>}
            {p2pSuccess && <p className="text-green-400 text-xs">Перевод выполнен</p>}
            <button
              onClick={handleP2PSubmit}
              disabled={p2pSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {p2pSubmitting ? '...' : 'Перевести'}
            </button>
          </div>
        </div>
      )}

      {/* Panel 3: Exchange Coins to Money */}
      <div className="bg-gray-800 rounded-xl p-4 mt-4">
        <button
          onClick={() => setExchangeExpanded(prev => !prev)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-base font-semibold text-white">Обмен монет на деньги</h2>
          <span className="text-gray-400 text-sm">{exchangeExpanded ? '▲' : '▼'}</span>
        </button>
        {exchangeExpanded && (
          <div className="flex flex-col gap-2 mt-3">
            <input
              type="number"
              value={exchangeCoinsInput}
              onChange={e => setExchangeCoinsInput(e.target.value)}
              placeholder="Количество монет"
              min={1}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {exchangePreview && (
              <p className="text-yellow-400 text-sm">
                ≈ {exchangePreview} руб (курс: {walletSettings?.base_exchange_rate}/100)
              </p>
            )}
            {exchangeError && <p className="text-red-400 text-xs">{exchangeError}</p>}
            {exchangeSuccess && <p className="text-green-400 text-xs">Обмен выполнен</p>}
            <button
              onClick={handleExchangeSubmit}
              disabled={exchangeSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {exchangeSubmitting ? '...' : 'Обменять'}
            </button>
          </div>
        )}
      </div>

      {/* Panel 4: Withdrawal */}
      <div className="bg-gray-800 rounded-xl p-4 mt-4">
        <h2 className="text-base font-semibold text-white mb-3">Вывод денег</h2>
        <div className="flex flex-col gap-2">
          <input
            type="number"
            value={withdrawalAmount}
            onChange={e => setWithdrawalAmount(e.target.value)}
            placeholder="Сумма (руб.)"
            min={0.01}
            step={0.01}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {withdrawalError && <p className="text-red-400 text-xs">{withdrawalError}</p>}
          {withdrawalSuccess && <p className="text-green-400 text-xs">Запрос отправлен</p>}
          <button
            onClick={handleWithdrawalSubmit}
            disabled={withdrawalSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {withdrawalSubmitting ? '...' : 'Запросить вывод'}
          </button>
        </div>

        {/* Pending withdrawals */}
        {pendingWithdrawals.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Ожидают одобрения</h3>
            {pendingWithdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-yellow-400 font-semibold text-sm">
                  💵 {Number(w.amount).toFixed(2)} руб
                </span>
                <span className="text-xs text-gray-500">{formatDate(w.requested_at)}</span>
                <span className="bg-yellow-900 text-yellow-300 rounded-full px-2 py-0.5 text-xs">
                  Ожидает
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Approved withdrawals (last 5) */}
        {approvedWithdrawals.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Одобренные (последние 5)</h3>
            {approvedWithdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-yellow-400 font-semibold text-sm">
                  💵 {Number(w.amount).toFixed(2)} руб
                </span>
                <span className="text-xs text-gray-500">{formatDate(w.requested_at)}</span>
                <span className="bg-green-900 text-green-300 rounded-full px-2 py-0.5 text-xs">
                  Одобрено
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
