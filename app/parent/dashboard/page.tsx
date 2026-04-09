'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getChildren } from '@/lib/repositories/children.repo'
import { getDay } from '@/lib/repositories/children.repo'
import { getWeekScore } from '@/lib/services/coins.service'
import { getWeekRange } from '@/utils/helpers'
import {
  getPendingPurchases,
  approvePurchase,
  rejectPurchase,
  deliverPurchase,
} from '@/lib/repositories/wallet.repo'
import { supabase } from '@/lib/supabase'
import type { Child, DayData } from '@/lib/models/child.types'
import type { RewardPurchase } from '@/lib/models/wallet.types'

type WeekScore = {
  coinsFromGrades: number
  coinsFromRoom: number
  coinsFromBehavior: number
  total: number
  gradedDays: number
  roomOkDays: number
  filledDays: number
}

type ChildStatus = {
  child: Child
  dayData: DayData | null
  weekScore: WeekScore
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-800 rounded-xl h-44" />
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-400' : 'bg-gray-600'}`}
    />
  )
}

function ChildCard({ status, onFillDay }: { status: ChildStatus; onFillDay: () => void }) {
  const { child, dayData, weekScore } = status
  const roomOk = !!(dayData?.room_ok)
  const behaviorOk = !!(dayData?.good_behavior)

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{child.emoji}</span>
        <h2 className="text-xl font-bold text-white">{child.name}</h2>
      </div>

      {/* Coins */}
      <div className="flex items-center gap-2 text-yellow-400 font-semibold text-lg">
        <span>💰</span>
        <span>{weekScore.total} монет</span>
        <span className="text-gray-500 text-sm font-normal">за неделю</span>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-gray-300">
          <StatusDot ok={roomOk} />
          <span>Комната</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <StatusDot ok={behaviorOk} />
          <span>Поведение</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <StatusDot ok={weekScore.gradedDays > 0} />
          <span>{weekScore.gradedDays} дн. оценок</span>
        </div>
      </div>

      {/* Fill day button */}
      <button
        onClick={onFillDay}
        className="mt-1 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Заполнить день
      </button>
    </div>
  )
}

function PendingRequestsPanel({
  purchases,
  children,
  actionInProgress,
  onApprove,
  onReject,
}: {
  purchases: RewardPurchase[]
  children: Child[]
  actionInProgress: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const [showAll, setShowAll] = useState(false)

  if (purchases.length === 0) return null

  const childName = (childId: string) =>
    children.find(c => c.id === childId)?.name ?? childId

  const visible = showAll ? purchases : purchases.slice(0, 3)

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
            {purchases.length}
          </span>
          <h2 className="text-white font-semibold text-base">Запросы на покупку</h2>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visible.map(p => (
          <div key={p.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-lg">
              {p.reward_icon}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{p.reward_title}</p>
              <p className="text-gray-400 text-xs">{childName(p.child_id)}</p>
              <p className="text-amber-400 text-xs">{p.frozen_coins} монет</p>
              <p className="text-gray-500 text-xs">
                {new Date(p.purchased_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
            {/* Actions */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => onApprove(p.id)}
                disabled={actionInProgress === p.id}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {actionInProgress === p.id ? '...' : 'Одобрить'}
              </button>
              <button
                onClick={() => onReject(p.id)}
                disabled={actionInProgress === p.id}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {actionInProgress === p.id ? '...' : 'Отклонить'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {purchases.length > 3 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-indigo-400 text-sm hover:text-indigo-300 text-left"
        >
          {showAll ? 'Свернуть' : `Показать все (${purchases.length})`}
        </button>
      )}
    </div>
  )
}

function ApprovedPurchasesPanel({
  purchases,
  children,
  actionInProgress,
  onDeliver,
}: {
  purchases: RewardPurchase[]
  children: Child[]
  actionInProgress: string | null
  onDeliver: (id: string) => void
}) {
  if (purchases.length === 0) return null

  const childName = (childId: string) =>
    children.find(c => c.id === childId)?.name ?? childId

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold">
          {purchases.length}
        </span>
        <h2 className="text-white font-semibold text-base">Выдать покупки</h2>
      </div>

      <div className="flex flex-col gap-2">
        {purchases.map(p => (
          <div key={p.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-lg">
              {p.reward_icon}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{p.reward_title}</p>
              <p className="text-gray-400 text-xs">{childName(p.child_id)}</p>
              <p className="text-amber-400 text-xs">{p.frozen_coins} монет</p>
            </div>
            {/* Deliver button */}
            <button
              onClick={() => onDeliver(p.id)}
              disabled={actionInProgress === p.id}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
            >
              {actionInProgress === p.id ? '...' : 'Выдано ✓'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ParentDashboardPage() {
  const router = useRouter()
  const [statuses, setStatuses] = useState<ChildStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingPurchases, setPendingPurchases] = useState<RewardPurchase[]>([])
  const [approvedPurchases, setApprovedPurchases] = useState<RewardPurchase[]>([])
  const [purchaseActionInProgress, setPurchaseActionInProgress] = useState<string | null>(null)
  const [childrenList, setChildrenList] = useState<Child[]>([])

  const todayDate = new Date().toISOString().slice(0, 10)
  const weekStart = getWeekRange(new Date()).start

  useEffect(() => {
    async function load() {
      try {
        const children = await getChildren()
        setChildrenList(children)

        const [results, pendingData, approvedData] = await Promise.all([
          Promise.all(
            children.map(async (child) => {
              const [dayData, weekScore] = await Promise.all([
                getDay(child.id, todayDate).catch(() => null),
                getWeekScore(child.id, weekStart).catch(() => ({
                  coinsFromGrades: 0,
                  coinsFromRoom: 0,
                  coinsFromBehavior: 0,
                  total: 0,
                  gradedDays: 0,
                  roomOkDays: 0,
                  filledDays: 0,
                })),
              ])
              return { child, dayData, weekScore }
            })
          ),
          getPendingPurchases().catch(() => [] as RewardPurchase[]),
          supabase
            .from('reward_purchases')
            .select('*')
            .eq('status', 'approved')
            .order('purchased_at', { ascending: true })
            .then(({ data }) => (data ?? []) as RewardPurchase[]),
        ])

        setStatuses(results)
        setPendingPurchases(pendingData)
        setApprovedPurchases(approvedData)
      } catch (err) {
        console.error('[dashboard] load error:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
      }
    }
    load()
  }, [todayDate, weekStart])

  async function handleApprove(purchaseId: string) {
    setPurchaseActionInProgress(purchaseId)
    try {
      const approved = await approvePurchase(purchaseId)
      setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId))
      setApprovedPurchases(prev => [...prev, approved])
    } catch (err) {
      console.error('[dashboard] approve error:', err)
    } finally {
      setPurchaseActionInProgress(null)
    }
  }

  async function handleReject(purchaseId: string) {
    const note = window.prompt('Причина отклонения (необязательно):') ?? undefined
    setPurchaseActionInProgress(purchaseId)
    try {
      await rejectPurchase(purchaseId, note)
      setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId))
    } catch (err) {
      console.error('[dashboard] reject error:', err)
    } finally {
      setPurchaseActionInProgress(null)
    }
  }

  async function handleDeliver(purchaseId: string) {
    setPurchaseActionInProgress(purchaseId)
    try {
      await deliverPurchase(purchaseId)
      setApprovedPurchases(prev => prev.filter(p => p.id !== purchaseId))
    } catch (err) {
      console.error('[dashboard] deliver error:', err)
    } finally {
      setPurchaseActionInProgress(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Сегодня</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Pending purchase requests */}
      <PendingRequestsPanel
        purchases={pendingPurchases}
        children={childrenList}
        actionInProgress={purchaseActionInProgress}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Approved purchases ready to deliver */}
      <ApprovedPurchasesPanel
        purchases={approvedPurchases}
        children={childrenList}
        actionInProgress={purchaseActionInProgress}
        onDeliver={handleDeliver}
      />

      {/* Error state */}
      {error && (
        <p className="text-red-400 text-sm bg-red-950 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* Skeleton loading */}
      {!statuses && !error && (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Child status cards */}
      {statuses && (
        <div className="flex flex-col gap-4">
          {statuses.map(({ child, dayData, weekScore }) => (
            <ChildCard
              key={child.id}
              status={{ child, dayData, weekScore }}
              onFillDay={() => router.push(`/parent/daily?childId=${child.id}`)}
            />
          ))}
          {statuses.length === 0 && (
            <p className="text-gray-500 text-center py-8">Нет детей в семье</p>
          )}
        </div>
      )}
    </div>
  )
}
