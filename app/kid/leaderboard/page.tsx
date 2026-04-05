'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { getChildBadges } from '@/lib/services/badges.service'
import { useAppStore } from '@/lib/store'
import { normalizeDate, getWeekRange } from '@/utils/helpers'

interface ChildLeaderboardEntry {
  id: string
  name: string
  emoji: string
  level: number
  xp: number
  coins: number       // context-dependent (this week / all time)
  totalCoins: number  // wallet.coins (all-time balance)
  weekScore: number
  badgeCount: number
  longestStreak: number
}

function PodiumBlock({
  entry,
  rank,
  isMe,
  period,
}: {
  entry: ChildLeaderboardEntry
  rank: number
  isMe: boolean
  period: 'week' | 'month' | 'all'
}) {
  const heights: Record<1 | 2 | 3, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-12' }
  const colors: Record<1 | 2 | 3, string> = {
    1: 'bg-amber-100 border-amber-300',
    2: 'bg-gray-100 border-gray-300',
    3: 'bg-orange-50 border-orange-200',
  }
  const medals: Record<1 | 2 | 3, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const r = rank as 1 | 2 | 3

  const score =
    period === 'week' ? entry.weekScore : period === 'month' ? entry.totalCoins : entry.xp
  const unit = period === 'all' ? ' XP' : ' 💰'

  return (
    <div className={`flex flex-col items-center ${isMe ? 'scale-105' : ''}`}>
      <div className="text-3xl mb-1">{entry.emoji}</div>
      <p className={`text-xs font-bold ${isMe ? 'text-violet-600' : 'text-gray-700'}`}>
        {entry.name}
      </p>
      <p className="text-xs text-gray-400">Ур. {entry.level}</p>
      <p className="text-sm font-extrabold text-amber-600 mt-1">
        {score}
        {unit}
      </p>
      <div
        className={`${heights[r]} w-16 rounded-t-xl border-2 ${colors[r]} mt-2 flex items-center justify-center text-xl`}
      >
        {medals[r]}
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [childrenData, setChildrenData] = useState<ChildLeaderboardEntry[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const today = normalizeDate(new Date())
        const weekStart = getWeekRange(today).start

        const children = await api.getChildren()
        const entries = await Promise.all(
          children.map(async (child) => {
            const [wallet, weekScore, badges, streaks] = await Promise.all([
              getWallet(child.id),
              api.getWeekScore(child.id, weekStart),
              getChildBadges(child.id),
              api.getStreaks(child.id),
            ])
            const longestStreak = streaks.reduce(
              (max: number, s: { best_count: number }) => Math.max(max, s.best_count),
              0
            )
            return {
              id: child.id,
              name: child.name,
              emoji: child.emoji,
              level: child.level,
              xp: child.xp,
              coins: wallet?.coins ?? 0,
              totalCoins: wallet?.coins ?? 0,
              weekScore: weekScore.total,
              badgeCount: badges.length,
              longestStreak,
            }
          })
        )
        setChildrenData(entries)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activeMemberId])

  const sorted = [...childrenData].sort((a, b) => {
    if (period === 'week') return b.weekScore - a.weekScore
    if (period === 'month') return b.totalCoins - a.totalCoins
    return b.xp - a.xp // 'all' → by XP
  })
  const isSingleChild = sorted.length <= 1

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <h1 className="text-xl font-extrabold text-gray-800">Рейтинг</h1>

      {/* Period Selector */}
      {loading ? (
        <div className="kid-skeleton h-12 rounded-full" />
      ) : (
        <div className="flex bg-gray-100 rounded-full p-1 gap-1">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors
                ${period === p ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-400'}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Всё время'}
            </button>
          ))}
        </div>
      )}

      {/* Podium or Personal Best */}
      {loading ? (
        <div className="kid-skeleton h-48 rounded-2xl" />
      ) : isSingleChild ? (
        /* Personal Best — single child view */
        <div className="kid-card">
          <p className="text-sm font-bold text-gray-700 mb-2">Личный рекорд</p>
          <p className="text-xs text-gray-500 mb-3">
            Ты пока единственный участник. Может, кто-то присоединится! Вот твои рекорды:
          </p>
          {sorted[0] && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Монет за неделю</span>
                <span className="font-bold text-amber-600">{sorted[0].weekScore} 💰</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Всего монет</span>
                <span className="font-bold text-amber-600">{sorted[0].totalCoins} 💰</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Опыт</span>
                <span className="font-bold text-violet-600">{sorted[0].xp} XP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Значков</span>
                <span className="font-bold text-gray-700">{sorted[0].badgeCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Лучшая серия</span>
                <span className="font-bold text-orange-500">{sorted[0].longestStreak} дней</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Podium — multi-child view */
        <div className="kid-card">
          <div className="flex items-end justify-center gap-4 py-2">
            {/* 2nd place — left, shorter podium */}
            {sorted[1] && (
              <PodiumBlock
                entry={sorted[1]}
                rank={2}
                isMe={sorted[1].id === activeMemberId}
                period={period}
              />
            )}
            {/* 1st place — center, tallest */}
            <PodiumBlock
              entry={sorted[0]}
              rank={1}
              isMe={sorted[0].id === activeMemberId}
              period={period}
            />
            {/* 3rd place — right, shortest */}
            {sorted[2] && (
              <PodiumBlock
                entry={sorted[2]}
                rank={3}
                isMe={sorted[2].id === activeMemberId}
                period={period}
              />
            )}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {loading ? (
        <div className="kid-skeleton h-32 rounded-2xl" />
      ) : sorted.length >= 2 ? (
        <div className="kid-card">
          <p className="text-sm font-bold text-gray-700 mb-3">По категориям</p>
          {[
            {
              label: '💰 Монет за неделю',
              getValue: (e: ChildLeaderboardEntry) => e.weekScore,
            },
            {
              label: '🏅 Значков',
              getValue: (e: ChildLeaderboardEntry) => e.badgeCount,
            },
            {
              label: '🔥 Лучшая серия',
              getValue: (e: ChildLeaderboardEntry) => e.longestStreak,
            },
          ].map(({ label, getValue }) => {
            const values = sorted.map(getValue)
            const maxVal = Math.max(...values, 1)
            return (
              <div key={label} className="py-2 border-b border-gray-50 last:border-0">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                {sorted.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2 mb-1 ${
                      entry.id === activeMemberId ? 'font-bold' : ''
                    }`}
                  >
                    <span className="text-sm w-5">{entry.emoji}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          entry.id === activeMemberId ? 'bg-violet-500' : 'bg-gray-400'
                        }`}
                        style={{
                          width: `${Math.round((getValue(entry) / maxVal) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right">
                      {getValue(entry)}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
