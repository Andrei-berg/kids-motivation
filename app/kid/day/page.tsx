'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { Child, DayData, SubjectGrade, Goal } from '@/lib/api'
import { normalizeDate } from '@/utils/helpers'

// ============================================================================
// Level title helper
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
// Grade chip color helper
// ============================================================================

function gradeChipClass(grade: number): string {
  switch (grade) {
    case 5: return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    case 4: return 'bg-blue-100 text-blue-700 border border-blue-200'
    case 3: return 'bg-amber-100 text-amber-700 border border-amber-200'
    case 2: return 'bg-rose-100 text-rose-700 border border-rose-200'
    default: return 'bg-red-100 text-red-700 border border-red-200'
  }
}

// ============================================================================
// Streak type label helper
// ============================================================================

function streakLabel(type: string): string {
  switch (type) {
    case 'room':         return '🏠 Комната'
    case 'study':        return '📖 Учёба'
    case 'sport':        return '💪 Спорт'
    case 'strong_week':  return '💪 Сильная неделя'
    default:             return type
  }
}

// ============================================================================
// Week data shape
// ============================================================================

interface WeekStats {
  filledDays: number
  roomDays: number
  behaviorDays: number
  gradedDays: number
}

// ============================================================================
// Page
// ============================================================================

export default function KidDayPage() {
  const { activeMemberId } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [todayDay, setTodayDay] = useState<DayData | null>(null)
  const [todayGrades, setTodayGrades] = useState<SubjectGrade[]>([])
  const [weekData, setWeekData] = useState<WeekStats>({
    filledDays: 0,
    roomDays: 0,
    behaviorDays: 0,
    gradedDays: 0,
  })
  const [streaks, setStreaks] = useState<any[]>([])
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)

  useEffect(() => {
    if (!activeMemberId) {
      setLoading(false)
      return
    }

    async function loadData() {
      setLoading(true)
      try {
        const today = normalizeDate(new Date())
        const [childData, dayData, grades, weekRaw, streaksData, goalsData] =
          await Promise.all([
            api.getChild(activeMemberId!),
            api.getDay(activeMemberId!, today),
            api.getSubjectGradesForDate(activeMemberId!, today),
            api.getWeekData(activeMemberId!, today),
            api.getStreaks(activeMemberId!),
            api.getGoals(activeMemberId!),
          ])

        setChild(childData)
        setTodayDay(dayData)
        setTodayGrades(grades)

        // Compute week stats from per-day arrays returned by getWeekData
        // weekRaw = { week, days: DayData[], grades: SubjectGrade[], sports, weekRecord }
        const days: DayData[] = weekRaw?.days ?? []
        const weekGrades: SubjectGrade[] = weekRaw?.grades ?? []

        const roomDays = days.filter((d: DayData) => d.room_ok).length
        const behaviorDays = days.filter((d: DayData) => d.good_behavior).length
        const filledDays = days.length

        // gradedDays: count distinct dates that have at least one grade
        const gradedDates = new Set(weekGrades.map((g: SubjectGrade) => g.date))
        const gradedDays = gradedDates.size

        setWeekData({
          filledDays,
          roomDays,
          behaviorDays,
          gradedDays,
        })

        // Active streaks — filter out zero counts
        const activeStreaks = (streaksData ?? []).filter(
          (s: any) => s.current_count > 0
        )
        setStreaks(activeStreaks)
        setActiveGoal(goalsData?.active ?? null)
      } catch (err) {
        console.error('KidDayPage: loadData error', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeMemberId])

  // ========== Loading skeleton ==========
  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="kid-skeleton h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <div className="kid-skeleton h-24 rounded-2xl" />
          <div className="kid-skeleton h-24 rounded-2xl" />
          <div className="kid-skeleton h-24 rounded-2xl" />
        </div>
        <div className="kid-skeleton h-36 w-full rounded-2xl" />
      </div>
    )
  }

  // ========== Guard — no active member ==========
  if (!activeMemberId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 text-center text-gray-500">
        Ребёнок не определён — войди через родительский аккаунт
      </div>
    )
  }

  const levelInfo = getLevelTitle(child?.level ?? 1)
  const xpInLevel = (child?.xp ?? 0) % 1000

  // Grade average for today
  const gradeAvg =
    todayGrades.length > 0
      ? todayGrades.reduce((sum, g) => sum + g.grade, 0) / todayGrades.length
      : null

  function gradeAvgColor(avg: number): string {
    if (avg >= 4.5) return 'text-emerald-600'
    if (avg >= 3.5) return 'text-blue-600'
    return 'text-amber-600'
  }

  // SVG ring constants
  const RADIUS = 50
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const filledRatio = weekData.filledDays / 7
  const dashOffset = CIRCUMFERENCE * (1 - filledRatio)

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-4">

      {/* ====================================================
          A. Hero Banner
      ==================================================== */}
      <div className="kid-hero-gradient rounded-2xl p-5">
        {/* Top row: greeting + emoji */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-extrabold text-white leading-tight">
              Привет, {child?.name ?? ''}!
            </p>
            {/* Level badge pill */}
            <span className="mt-2 inline-block bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
              {levelInfo.emoji} Уровень {child?.level ?? 1} — {levelInfo.title}
            </span>
          </div>
          <span className="text-5xl select-none">{child?.emoji ?? '🧒'}</span>
        </div>

        {/* XP progress bar */}
        <div className="kid-xp-bar mt-3">
          <div
            className="kid-xp-bar-fill"
            style={{ width: `${Math.round(xpInLevel / 10)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/70 mt-1">
          <span>{xpInLevel} / 1000 XP</span>
          <span>до следующего уровня</span>
        </div>
      </div>

      {/* ====================================================
          B. Today's Snapshot
      ==================================================== */}
      {!todayDay && !loading ? (
        <div className="kid-card py-6 text-center text-gray-400">
          ⏳ Папа ещё не заполнил сегодняшний день
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {/* Room */}
          <div className={`kid-card text-center ${todayDay?.room_ok ? 'bg-emerald-50' : ''}`}>
            <div className="text-3xl">
              {todayDay?.room_ok ? '✅' : <span className="text-gray-300">❌</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1">Комната</p>
          </div>

          {/* Behavior */}
          <div className={`kid-card text-center ${todayDay?.good_behavior ? 'bg-emerald-50' : ''}`}>
            <div className="text-3xl">
              {todayDay?.good_behavior
                ? <span className="text-emerald-500">👍</span>
                : <span className="text-gray-300">👎</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1">Поведение</p>
          </div>

          {/* Study grades */}
          <div className="kid-card text-center">
            {gradeAvg !== null ? (
              <div className={`text-2xl font-extrabold ${gradeAvgColor(gradeAvg)}`}>
                {gradeAvg.toFixed(1)}
              </div>
            ) : (
              <div className="text-3xl text-gray-300">📚</div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {todayGrades.length > 0 ? `${todayGrades.length} оценок` : 'Оценок нет'}
            </p>
          </div>
        </div>
      )}

      {/* ====================================================
          C. Today's Grades Row
      ==================================================== */}
      {todayGrades.length > 0 && (
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">📚 Сегодняшние оценки</p>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {todayGrades.map((grade) => (
              <span
                key={grade.id}
                className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${gradeChipClass(grade.grade)}`}
              >
                {grade.subject} {grade.grade}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================
          D. Week Progress Ring
      ==================================================== */}
      <div className="kid-card">
        <p className="text-sm font-bold text-gray-700 mb-3">📅 Прогресс недели</p>
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg viewBox="0 0 120 120" width={120} height={120}>
              {/* Track */}
              <circle
                cx={60}
                cy={60}
                r={RADIUS}
                className="kid-progress-ring-track"
                strokeWidth={8}
                fill="none"
              />
              {/* Fill */}
              <circle
                cx={60}
                cy={60}
                r={RADIUS}
                className="kid-progress-ring-fill"
                strokeWidth={8}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
              {/* Center text */}
              <text
                x={60}
                y={65}
                textAnchor="middle"
                className="text-xl font-extrabold fill-gray-800"
                style={{ fontSize: '20px', fontWeight: 800 }}
              >
                {weekData.filledDays}/7
              </text>
            </svg>
          </div>

          {/* Stats row below ring */}
          <div className="flex gap-4 mt-3 justify-center flex-wrap">
            <span className="text-xs font-medium text-gray-600">
              🏠 Комната: {weekData.roomDays} дн.
            </span>
            <span className="text-xs font-medium text-gray-600">
              😊 Поведение: {weekData.behaviorDays} дн.
            </span>
            <span className="text-xs font-medium text-gray-600">
              📖 Оценки: {weekData.gradedDays} дн.
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================
          E. Active Streaks Bar
      ==================================================== */}
      {streaks.length > 0 && (
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">🔥 Активные серии</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {streaks.map((streak: any) => {
              const fireClasses = [
                streak.current_count > 10 ? 'kid-fire-glow' : '',
                streak.current_count > 5  ? 'kid-fire-pulse' : '',
              ].filter(Boolean).join(' ')

              return (
                <span
                  key={streak.id}
                  className={`bg-orange-50 text-orange-700 border border-orange-200 px-3 py-2 rounded-2xl flex items-center gap-2 text-sm font-semibold whitespace-nowrap ${fireClasses}`}
                >
                  <span>🔥</span>
                  <span>{streakLabel(streak.streak_type)}</span>
                  <span className="font-extrabold">{streak.current_count}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ====================================================
          F. Active Goal Widget
      ==================================================== */}
      {activeGoal && (
        <div
          className={`kid-card ${
            activeGoal.current / activeGoal.target > 0.75 ? 'kid-goal-glow' : ''
          }`}
        >
          <p className="text-sm font-bold text-gray-700">🎯 Моя цель</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{activeGoal.title}</p>
          <div className="bg-gray-100 rounded-full h-3 mt-2">
            <div
              className="h-3 rounded-full"
              style={{
                background: 'var(--kid-gradient-coin)',
                width: `${Math.min(100, Math.round((activeGoal.current / activeGoal.target) * 100))}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {activeGoal.current} / {activeGoal.target} монет
          </p>
        </div>
      )}

    </div>
  )
}
