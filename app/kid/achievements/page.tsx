'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getChildBadges, getAvailableBadges } from '@/lib/services/badges.service'
import { api } from '@/lib/api'
import type { Child } from '@/lib/api'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { supabase } from '@/lib/supabase'

// ============================================================================
// LEVEL SYSTEM
// ============================================================================

const LEVEL_TITLES: Record<number, { title: string; emoji: string }> = {
  1: { title: 'Новичок',   emoji: '🥚' },
  2: { title: 'Ученик',    emoji: '🌱' },
  3: { title: 'Старатель', emoji: '⭐' },
  4: { title: 'Мастер',    emoji: '✨' },
  5: { title: 'Эксперт',   emoji: '💎' },
  6: { title: 'Чемпион',   emoji: '🏆' },
  7: { title: 'Легенда',   emoji: '👑' },
}

function getLevelTitle(level: number) {
  return LEVEL_TITLES[level] ?? { title: 'Супергерой', emoji: '🦸' }
}

// ============================================================================
// BADGE PROGRESS COMPUTATION
// ============================================================================

async function computeBadgeProgress(
  childId: string,
  streaks: Array<{ streak_type: string; current_count: number; best_count: number }>
): Promise<Record<string, { current: number; target: number; label: string }>> {
  const progress: Record<string, { current: number; target: number; label: string }> = {}

  // clean_master: count days where room_ok=true (target: 14)
  const { count: roomDays } = await supabase
    .from('days')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('room_ok', true)
  progress['clean_master'] = { current: roomDays ?? 0, target: 14, label: 'дн. уборки' }

  // sportsman: count sport days from home_sports (sport_ok column doesn't exist in days)
  const { count: sportDays } = await supabase
    .from('home_sports')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
  progress['sportsman'] = { current: sportDays ?? 0, target: 14, label: 'дн. спорта' }

  // week_excellent: count days with grade=5 (target: 7)
  const { count: grade5Days } = await supabase
    .from('subject_grades')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('grade', 5)
  progress['week_excellent'] = { current: grade5Days ?? 0, target: 7, label: 'отл. оценок' }

  // full_week_grades: count distinct days with grades this week (target: 5)
  const today = new Date()
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - dayOfWeek)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = today.toISOString().split('T')[0]
  const { data: weekGrades } = await supabase
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
  const uniqueDaysThisWeek = new Set((weekGrades ?? []).map((g: any) => g.date)).size
  progress['full_week_grades'] = { current: uniqueDaysThisWeek, target: 5, label: 'дн. этой нед.' }

  // coin_saver: net saved coins (target: 500)
  const wallet = await getWallet(childId)
  const netSaved = (wallet?.total_earned_coins ?? 0) - (wallet?.total_spent_coins ?? 0)
  progress['coin_saver'] = { current: Math.max(0, netSaved), target: 500, label: 'монет накоп.' }

  // streak_30: best streak across all types (target: 30)
  const bestStreak = streaks.reduce((max, s) => Math.max(max, s.best_count), 0)
  progress['streak_30'] = { current: bestStreak, target: 30, label: 'дн. серии' }

  // first_purchase: 0 or 1 (target: 1)
  const { count: purchaseCount } = await supabase
    .from('reward_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
  progress['first_purchase'] = { current: Math.min(purchaseCount ?? 0, 1), target: 1, label: 'покупка' }

  // study_lover: count days with any subject grades (target: 10)
  const { data: gradeDays } = await supabase
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
  const uniqueGradeDays = new Set((gradeDays ?? []).map((g: any) => g.date)).size
  progress['study_lover'] = { current: uniqueGradeDays, target: 10, label: 'дн. с оценками' }

  return progress
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function AchievementsPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [earnedBadges, setEarnedBadges] = useState<any[]>([])
  const [streaks, setStreaks] = useState<any[]>([])
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null)
  const [badgeProgress, setBadgeProgress] = useState<Record<string, { current: number; target: number; label: string }>>({})

  useEffect(() => {
    if (!activeMemberId) return

    const load = async () => {
      setLoading(true)
      try {
        const [childData, earned, streaksData] = await Promise.all([
          api.getChild(activeMemberId),
          getChildBadges(activeMemberId),
          api.getStreaks(activeMemberId),
        ])
        setChild(childData)
        setEarnedBadges(earned)
        setStreaks(streaksData ?? [])

        const prog = await computeBadgeProgress(activeMemberId, streaksData ?? [])
        setBadgeProgress(prog)
      } catch (err) {
        console.error('Error loading achievements:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activeMemberId])

  // Computed values
  const allBadges = getAvailableBadges()
  const earnedKeys = new Set(earnedBadges.map(b => b.badge_key))
  const totalXP = earnedBadges.reduce((sum, b) => sum + (b.xp_reward || 0), 0)
  const longestStreak = streaks.reduce((max, s) => Math.max(max, s.best_count), 0)
  const levelInfo = getLevelTitle(child?.level ?? 1)
  const xpInLevel = (child?.xp ?? 0) % 1000
  const nextLevelXP = 1000

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="kid-skeleton h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="kid-skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="kid-skeleton h-8 rounded-xl w-40" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="kid-skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

      {/* A. Level Card */}
      <div className="kid-xp-gradient rounded-2xl p-6 text-white text-center">
        <div
          className="text-7xl font-extrabold"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
        >
          {child?.level ?? 1}
        </div>
        <div className="text-4xl mt-1">{levelInfo.emoji}</div>
        <div className="text-xl font-bold mt-2">{levelInfo.title}</div>

        {/* XP bar */}
        <div className="kid-xp-bar mt-4 w-full">
          <div
            className="kid-xp-bar-fill"
            style={{ width: `${Math.round(xpInLevel / nextLevelXP * 100)}%` }}
          />
        </div>
        <div className="text-white/70 text-sm mt-2">
          {xpInLevel} / {nextLevelXP} XP до уровня {(child?.level ?? 1) + 1}
        </div>
      </div>

      {/* B. Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="kid-card text-center border-t-4 border-violet-400">
          <div className="text-2xl font-extrabold text-gray-800">⭐ {totalXP}</div>
          <div className="text-xs text-gray-500 mt-1">XP всего</div>
        </div>
        <div className="kid-card text-center border-t-4 border-amber-400">
          <div className="text-2xl font-extrabold text-gray-800">{earnedBadges.length} / {allBadges.length}</div>
          <div className="text-xs text-gray-500 mt-1">Значков</div>
        </div>
        <div className="kid-card text-center border-t-4 border-orange-400">
          <div className="text-2xl font-extrabold text-gray-800">🔥 {longestStreak}</div>
          <div className="text-xs text-gray-500 mt-1">Лучшая серия</div>
        </div>
        <div className="kid-card text-center border-t-4 border-emerald-400">
          <div className="text-2xl font-extrabold text-gray-800">
            🏆 {earnedBadges.length > 0 ? 'Есть!' : 'Пока нет'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Достижения</div>
        </div>
      </div>

      {/* C. Badge Gallery */}
      <div className="kid-card">
        <p className="text-sm font-bold text-gray-700">🏅 Мои значки</p>
        <div className="grid grid-cols-3 gap-3 mt-3 md:grid-cols-4">
          {allBadges.map(badge => {
            const earned = earnedBadges.find(e => e.badge_key === badge.key)
            const isEarned = !!earned
            const prog = badgeProgress[badge.key]

            return (
              <div
                key={badge.key}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 cursor-pointer transition-all
                  ${isEarned
                    ? 'border-amber-300 bg-amber-50 shadow-sm hover:shadow-md'
                    : 'border-gray-100 bg-gray-50 kid-badge-locked'
                  }`}
                onClick={() => isEarned && setSelectedBadge(earned)}
                aria-label={badge.title}
              >
                <span className="text-3xl">{badge.icon}</span>
                <span className={`text-xs font-semibold mt-1 text-center leading-tight
                  ${isEarned ? 'text-gray-800' : 'text-gray-400'}`}>
                  {badge.title}
                </span>
                {isEarned ? (
                  <span className="text-xs text-amber-600 font-bold mt-1">+{earned.xp_reward} XP</span>
                ) : (
                  <>
                    <span className="text-lg mt-1">🔒</span>
                    {prog && (
                      <div className="w-full mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className="h-1 rounded-full bg-violet-400"
                            style={{ width: `${Math.min(100, Math.round(prog.current / prog.target * 100))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 block text-center">
                          {prog.current}/{prog.target} {prog.label}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {earnedBadges.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4">
            Собери первый значок! Начни убирать комнату каждый день 🏠
          </p>
        )}
      </div>

      {/* D. Streak Records */}
      <div className="kid-card">
        <p className="text-sm font-bold text-gray-700">🔥 Рекорды серий</p>
        {(['room', 'study', 'sport'] as const).map(type => {
          const streak = streaks.find(s => s.streak_type === type)
          const typeConfig = {
            room:  { label: '🏠 Комната', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            study: { label: '📖 Учёба',   color: 'bg-blue-50 border-blue-200 text-blue-700' },
            sport: { label: '💪 Спорт',   color: 'bg-orange-50 border-orange-200 text-orange-700' },
          }[type]
          return (
            <div key={type} className={`flex items-center justify-between p-3 rounded-xl border ${typeConfig.color} mt-2`}>
              <span className="text-sm font-semibold">{typeConfig.label}</span>
              <div className="text-right">
                <div className="text-lg font-extrabold">{streak?.current_count ?? 0} 🔥</div>
                <div className="text-xs opacity-70">Рекорд: {streak?.best_count ?? 0}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* E. Badge Detail Bottom Sheet */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setSelectedBadge(null)}>
          <div
            className="kid-bottom-sheet bg-white w-full rounded-t-3xl p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-6xl mb-3">{selectedBadge.icon}</div>
            <h3 className="text-xl font-bold text-gray-800">{selectedBadge.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{selectedBadge.description}</p>
            <div className="mt-3 inline-block bg-amber-100 text-amber-700 text-sm font-bold px-4 py-1 rounded-full">
              +{selectedBadge.xp_reward} XP
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Получено: {new Date(selectedBadge.earned_at).toLocaleDateString('ru-RU')}
            </p>
            <button
              className="mt-4 w-full bg-violet-500 text-white font-bold py-3 rounded-xl"
              onClick={() => setSelectedBadge(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
