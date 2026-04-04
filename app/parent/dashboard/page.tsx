'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getChildren } from '@/lib/repositories/children.repo'
import { getDay } from '@/lib/repositories/children.repo'
import { getWeekScore } from '@/lib/services/coins.service'
import { getWeekRange } from '@/utils/helpers'
import type { Child, DayData } from '@/lib/models/child.types'

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

export default function ParentDashboardPage() {
  const router = useRouter()
  const [statuses, setStatuses] = useState<ChildStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const todayDate = new Date().toISOString().slice(0, 10)
  const weekStart = getWeekRange(new Date()).start

  useEffect(() => {
    async function load() {
      try {
        const children = await getChildren()
        const results = await Promise.all(
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
        )
        setStatuses(results)
      } catch (err) {
        console.error('[dashboard] load error:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
      }
    }
    load()
  }, [todayDate, weekStart])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Сегодня</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

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
