'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getWallet,
  getRewards,
  purchaseReward,
  getPurchases,
} from '@/lib/repositories/wallet.repo'
import type { Wallet, Reward, RewardPurchase } from '@/lib/models/wallet.types'

export default function KidShopPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [purchases, setPurchases] = useState<RewardPurchase[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [confirmStep, setConfirmStep] = useState<'detail' | 'confirm'>('detail')
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData(memberId: string) {
    setLoading(true)
    try {
      const [walletData, rewardsData, purchasesData] = await Promise.all([
        getWallet(memberId),
        getRewards({ activeOnly: true }),
        getPurchases(memberId),
      ])
      const filtered = rewardsData.filter(
        (r) => !r.for_child || r.for_child === memberId
      )
      setWallet(walletData)
      setRewards(filtered)
      setPurchases(purchasesData)
    } catch (err) {
      console.error('Failed to load shop data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeMemberId) {
      loadData(activeMemberId)
    }
  }, [activeMemberId])

  const categories = [
    'all',
    ...Array.from(
      new Set(rewards.filter((r) => r.category).map((r) => r.category!))
    ),
  ]

  const visibleRewards =
    selectedCategory === 'all'
      ? rewards
      : rewards.filter((r) => r.category === selectedCategory)

  const coinBalance = wallet?.coins ?? 0

  function getPrice(reward: Reward): number | null {
    return reward.reward_type === 'coins' ? (reward.price_coins ?? 0) : null
  }

  function canAfford(reward: Reward): boolean {
    const price = getPrice(reward)
    return price === null || coinBalance >= price
  }

  function getShortfall(reward: Reward): number {
    const price = getPrice(reward)
    if (price === null || coinBalance >= price) return 0
    return price - coinBalance
  }

  function canAfford_forSelected(): boolean {
    if (!selectedReward) return false
    return canAfford(selectedReward)
  }

  function shortfall_forSelected(): number {
    if (!selectedReward) return 0
    return getShortfall(selectedReward)
  }

  async function handlePurchase() {
    if (!activeMemberId || !selectedReward) return
    setPurchasing(true)
    try {
      await purchaseReward(activeMemberId, selectedReward.id)
      setSelectedReward(null)
      showToast('Запрос отправлен! 📨 Ожидай одобрения родителя')
      const [walletData, purchasesData] = await Promise.all([
        getWallet(activeMemberId),
        getPurchases(activeMemberId),
      ])
      setWallet(walletData)
      setPurchases(purchasesData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      showToast(`Ошибка: ${message}`)
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="kid-skeleton h-12 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kid-skeleton h-36 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-violet-500 text-white text-sm font-semibold px-4 py-3 rounded-xl text-center shadow-lg">
          {toast}
        </div>
      )}

      {/* A. Balance Reminder Strip */}
      <div className="sticky top-0 z-10 bg-amber-50 pt-2 pb-2 -mx-4 px-4">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <span className="text-xl">💰</span>
          <span className="text-sm font-bold text-amber-700">
            {wallet?.coins ?? 0} монет
          </span>
          <span className="text-xs text-amber-500 ml-1">доступно</span>
        </div>
      </div>

      {/* B. Category Tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer border-0 ${
                selectedCategory === cat
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'Все' : cat}
            </button>
          ))}
        </div>
      )}

      {/* C. Rewards Grid */}
      {visibleRewards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛍️</div>
          <p className="text-gray-500">
            Магазин пока пуст. Попроси родителей добавить награды!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {visibleRewards.map((reward) => {
            const price = getPrice(reward)
            const affordable = canAfford(reward)
            const shortfall = getShortfall(reward)

            return (
              <div
                key={reward.id}
                className={`kid-card cursor-pointer hover:scale-[1.02] transition-transform ${
                  !affordable ? 'opacity-75' : ''
                }`}
                onClick={() => {
                  setSelectedReward(reward)
                  setConfirmStep('detail')
                }}
                aria-label={reward.title}
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-50 mx-auto mb-2 text-3xl">
                  {reward.icon || '🎁'}
                </div>
                <p className="text-sm font-bold text-gray-800 text-center leading-tight">
                  {reward.title}
                </p>
                {reward.description && (
                  <p className="text-xs text-gray-400 text-center mt-1 truncate">
                    {reward.description}
                  </p>
                )}
                <div
                  className={`mt-2 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                    affordable
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  💰{' '}
                  {price !== null
                    ? `${price} монет`
                    : `${reward.price_money} руб.`}
                </div>
                {!affordable && shortfall > 0 && (
                  <p className="text-xs text-gray-400 text-center mt-1">
                    Не хватает {shortfall} монет
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* D. My Requests */}
      {purchases.length > 0 && (
        <div className="kid-card">
          <p className="text-sm font-bold text-gray-700 mb-3">📨 Мои запросы</p>
          {purchases.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <span className="text-xl">{p.reward_icon || '🎁'}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {p.reward_title}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(p.purchased_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                {p.fulfilled ? '✅ Выполнено' : '⏳ Ожидает'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* E. Reward Detail Bottom Sheet */}
      {selectedReward !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setSelectedReward(null)}
        >
          <div
            className="kid-bottom-sheet bg-white w-full rounded-t-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmStep === 'detail' ? (
              <>
                <div className="text-center">
                  <div className="text-6xl mb-3">
                    {selectedReward.icon || '🎁'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {selectedReward.title}
                  </h3>
                  {selectedReward.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedReward.description}
                    </p>
                  )}
                  <div className="mt-3 inline-block bg-amber-100 text-amber-700 text-base font-bold px-4 py-2 rounded-full">
                    💰{' '}
                    {selectedReward.price_coins ?? selectedReward.price_money}{' '}
                    {selectedReward.reward_type === 'coins' ? 'монет' : 'руб.'}
                  </div>
                </div>
                <button
                  className="mt-5 w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canAfford_forSelected()}
                  onClick={() => setConfirmStep('confirm')}
                >
                  {canAfford_forSelected()
                    ? '🛍️ Хочу это!'
                    : `Копи ещё ${shortfall_forSelected()} монет`}
                </button>
                <button
                  className="mt-2 w-full text-gray-400 text-sm py-2"
                  onClick={() => setSelectedReward(null)}
                >
                  Закрыть
                </button>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-3">🛒</div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Точно хочешь?
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Спишется {selectedReward.price_coins} монет за «
                    {selectedReward.title}»
                  </p>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl"
                    onClick={() => setConfirmStep('detail')}
                  >
                    Назад
                  </button>
                  <button
                    className="flex-1 bg-violet-500 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                    disabled={purchasing}
                    onClick={handlePurchase}
                  >
                    {purchasing ? 'Отправляем...' : 'Подтвердить'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
