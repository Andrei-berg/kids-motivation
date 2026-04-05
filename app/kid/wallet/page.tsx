'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getWallet,
  getTransactions,
  requestWithdrawal,
  getWithdrawals,
  getPurchases,
} from '@/lib/repositories/wallet.repo'
import { api } from '@/lib/api'
import type { Wallet, WalletTransaction, CashWithdrawal, RewardPurchase } from '@/lib/models/wallet.types'
import { normalizeDate, getWeekRange, formatDate } from '@/utils/helpers'

// ============================================================================
// Helpers
// ============================================================================

function groupByDate(transactions: WalletTransaction[]): { [date: string]: WalletTransaction[] } {
  const groups: { [date: string]: WalletTransaction[] } = {}
  for (const tx of transactions) {
    const date = tx.created_at.slice(0, 10)
    if (!groups[date]) groups[date] = []
    groups[date].push(tx)
  }
  return groups
}

function relativeDate(dateStr: string): string {
  const today = normalizeDate(new Date())
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return normalizeDate(d)
  })()
  if (dateStr === today) return 'Сегодня'
  if (dateStr === yesterday) return 'Вчера'
  return formatDate(dateStr)
}

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'pending':  return { label: 'Ожидает',   cls: 'bg-amber-100 text-amber-700' }
    case 'approved': return { label: 'Одобрено',  cls: 'bg-emerald-100 text-emerald-700' }
    case 'rejected': return { label: 'Отклонено', cls: 'bg-rose-100 text-rose-700' }
    default:         return { label: status,       cls: 'bg-gray-100 text-gray-600' }
  }
}

const PAGE_SIZE = 20

// ============================================================================
// Component
// ============================================================================

export default function KidWalletPage() {
  const { activeMemberId } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [txLimit, setTxLimit] = useState(PAGE_SIZE)
  const [hasMoreTx, setHasMoreTx] = useState(true)
  const [weekScore, setWeekScore] = useState<{
    total: number
    coinsFromGrades: number
    coinsFromRoom: number
    coinsFromBehavior: number
    gradedDays: number
    roomOkDays: number
    filledDays: number
  } | null>(null)
  const [withdrawals, setWithdrawals] = useState<CashWithdrawal[]>([])
  const [purchases, setPurchases] = useState<RewardPurchase[]>([])

  // Withdrawal sheet
  const [showWithdrawalSheet, setShowWithdrawalSheet] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(10)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  // Exchange tooltip
  const [showExchangeInfo, setShowExchangeInfo] = useState(false)

  // ============================================================================
  // Data loading
  // ============================================================================

  const loadData = useCallback(async (limit: number = PAGE_SIZE) => {
    if (!activeMemberId) return
    setLoading(true)
    try {
      const today = normalizeDate(new Date())
      const weekStart = getWeekRange(today).start

      const [walletData, txData, weekData, withdrawData, purchaseData] = await Promise.all([
        getWallet(activeMemberId),
        getTransactions(activeMemberId, limit),
        api.getWeekScore(activeMemberId, weekStart),
        getWithdrawals(activeMemberId),
        getPurchases(activeMemberId),
      ])

      setWallet(walletData)
      setTransactions(txData)
      setHasMoreTx(txData.length === limit)
      setWeekScore(weekData)
      setWithdrawals(withdrawData)
      setPurchases(purchaseData)
    } catch (err) {
      console.error('KidWalletPage loadData error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeMemberId])

  useEffect(() => {
    loadData(txLimit)
  }, [activeMemberId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreTransactions = useCallback(async () => {
    if (!activeMemberId) return
    const newLimit = txLimit + PAGE_SIZE
    setTxLimit(newLimit)
    try {
      const txData = await getTransactions(activeMemberId, newLimit)
      setTransactions(txData)
      setHasMoreTx(txData.length === newLimit)
    } catch (err) {
      console.error('loadMoreTransactions error:', err)
    }
  }, [activeMemberId, txLimit])

  // ============================================================================
  // Withdrawal handler
  // ============================================================================

  const handleWithdrawal = useCallback(async () => {
    if (!activeMemberId || withdrawAmount <= 0) return
    setWithdrawing(true)
    try {
      await requestWithdrawal(activeMemberId, withdrawAmount)
      const withdrawData = await getWithdrawals(activeMemberId)
      setWithdrawals(withdrawData)
      setShowWithdrawalSheet(false)
      setWithdrawSuccess(true)
      setTimeout(() => setWithdrawSuccess(false), 3000)
    } catch (err) {
      console.error('handleWithdrawal error:', err)
    } finally {
      setWithdrawing(false)
    }
  }, [activeMemberId, withdrawAmount])

  // ============================================================================
  // Loading skeleton
  // ============================================================================

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="kid-skeleton h-40 rounded-2xl" />
        <div className="kid-skeleton h-20 rounded-2xl" />
        <div className="kid-skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  // ============================================================================
  // Grouped transactions
  // ============================================================================

  const groupedTx = groupByDate(transactions)
  const sortedDates = Object.keys(groupedTx).sort((a, b) => (b > a ? 1 : -1))

  const hasRequests = purchases.length > 0 || withdrawals.length > 0

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-6">

      {/* Success toast */}
      {withdrawSuccess && (
        <div className="bg-emerald-500 text-white text-sm font-semibold text-center py-2 px-4 rounded-xl">
          Запрос на вывод отправлен!
        </div>
      )}

      {/* ====================================================================
          A. Balance Hero
      ==================================================================== */}
      <div className="kid-coin-gradient rounded-2xl p-6 flex flex-col items-center shadow-lg">
        <span className="kid-coin-bounce text-5xl mb-1">💰</span>
        <span className="text-5xl font-extrabold text-white text-center block">
          {wallet?.coins ?? 0}
        </span>
        <span className="text-white/80 text-sm text-center mt-1">монет</span>
        <span className="text-white/70 text-sm text-center mt-1">
          {wallet?.money != null ? Number(wallet.money).toFixed(2) : '0.00'} руб.
        </span>
        <div className="flex gap-2 justify-center mt-3 flex-wrap">
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Заработано: {wallet?.total_earned_coins ?? 0}
          </span>
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Потрачено: {wallet?.total_spent_coins ?? 0}
          </span>
        </div>
      </div>

      {/* ====================================================================
          B. Quick Actions
      ==================================================================== */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setWithdrawAmount(10); setShowWithdrawalSheet(true) }}
          disabled={!wallet || Number(wallet.money) <= 0}
          className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl w-full transition-colors"
        >
          💸 Запросить вывод
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExchangeInfo(v => !v)}
            className="bg-amber-100 text-amber-700 font-semibold py-3 rounded-xl w-full"
          >
            💱 Обменять монеты
          </button>
          {showExchangeInfo && (
            <div
              className="absolute top-full left-0 right-0 mt-1 z-10 bg-white border border-amber-200 rounded-xl p-3 shadow-lg text-xs text-amber-700"
              onClick={() => setShowExchangeInfo(false)}
            >
              Попроси родителя обменять монеты в личном кабинете
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          C. This Week's Earnings
      ==================================================================== */}
      {weekScore && (
        <div className="kid-card">
          <p className="text-sm font-bold text-gray-700 mb-3">📊 Заработано на этой неделе</p>
          <div className="space-y-2">
            {[
              { label: '📚 Оценки',    value: weekScore.coinsFromGrades,   bar: 'bg-blue-400'    },
              { label: '🏠 Комната',   value: weekScore.coinsFromRoom,     bar: 'bg-emerald-400' },
              { label: '😊 Поведение', value: weekScore.coinsFromBehavior, bar: 'bg-violet-400'  },
              { label: '💪 Спорт',     value: 0,                           bar: 'bg-orange-400'  },
            ].map(({ label, value, bar }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bar}`} />
                <span className="text-sm text-gray-600 flex-1">{label}</span>
                <span className={`text-sm font-bold ${value > 0 ? 'text-emerald-600' : value < 0 ? 'text-rose-500' : 'text-gray-500'}`}>
                  {value > 0 ? '+' : ''}{value}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
              <span className="text-sm font-bold text-gray-700 flex-1">Итого</span>
              <span className={`text-base font-bold ${weekScore.total > 0 ? 'text-emerald-600' : weekScore.total < 0 ? 'text-rose-500' : 'text-gray-500'}`}>
                {weekScore.total > 0 ? '+' : ''}{weekScore.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          D. Transaction History
      ==================================================================== */}
      <div className="kid-card">
        <p className="text-sm font-bold text-gray-700 mb-3">📋 История транзакций</p>

        {transactions.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <span className="text-4xl block mb-2">🐷</span>
            <p className="text-sm">Транзакций пока нет. Начни зарабатывать!</p>
          </div>
        ) : (
          <>
            {sortedDates.map(date => (
              <div key={date}>
                <p className="text-xs text-gray-400 font-medium uppercase py-2 sticky top-0 bg-white">
                  {relativeDate(date)}
                </p>
                {groupedTx[date].map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                      {tx.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400">{formatDate(tx.created_at.slice(0, 10))}</p>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${tx.coins_change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {tx.coins_change >= 0 ? '+' : ''}{tx.coins_change}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {hasMoreTx && (
              <button
                onClick={loadMoreTransactions}
                className="bg-gray-100 text-gray-600 text-sm rounded-xl py-2 px-4 w-full mt-2 hover:bg-gray-200 transition-colors"
              >
                Загрузить ещё
              </button>
            )}
          </>
        )}
      </div>

      {/* ====================================================================
          E. My Requests
      ==================================================================== */}
      {hasRequests && (
        <div className="kid-card">
          <p className="text-sm font-bold text-gray-700 mb-3">📨 Мои запросы</p>

          {/* Purchase requests */}
          {purchases.map(p => {
            const fulfillStatus = p.fulfilled ? 'approved' : 'pending'
            const badge = statusBadge(fulfillStatus)
            return (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                  {p.reward_icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.reward_title}</p>
                  <p className="text-xs text-gray-400">
                    {p.price_coins != null ? `${p.price_coins} монет` : p.price_money != null ? `${p.price_money} руб.` : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            )
          })}

          {/* Withdrawal requests */}
          {withdrawals.map(w => {
            const badge = statusBadge(w.status)
            return (
              <div key={w.id} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                  💸
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Вывод {w.amount} руб.</p>
                  <p className="text-xs text-gray-400">{formatDate(w.requested_at.slice(0, 10))}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ====================================================================
          F. Withdrawal Bottom Sheet
      ==================================================================== */}
      {showWithdrawalSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setShowWithdrawalSheet(false)}
        >
          <div
            className="kid-bottom-sheet absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Запрос на вывод</h3>
            <p className="text-sm text-gray-500 mb-4">
              Баланс: {wallet ? Number(wallet.money).toFixed(2) : '0.00'} руб.
            </p>
            <div className="flex items-center gap-4 mb-6">
              <button
                className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold flex items-center justify-center"
                onClick={() => setWithdrawAmount(a => Math.max(1, a - 10))}
              >
                −
              </button>
              <span className="flex-1 text-center text-2xl font-extrabold text-gray-800">
                {withdrawAmount} руб.
              </span>
              <button
                className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold flex items-center justify-center"
                onClick={() => setWithdrawAmount(a => a + 10)}
              >
                +
              </button>
            </div>
            <button
              className="w-full bg-violet-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-opacity"
              disabled={withdrawing || withdrawAmount <= 0}
              onClick={handleWithdrawal}
            >
              {withdrawing ? 'Отправляем...' : 'Отправить запрос'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
