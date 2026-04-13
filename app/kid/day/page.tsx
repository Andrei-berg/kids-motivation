'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import { api, getChildren } from '@/lib/api'
import type { Child, DayData, SubjectGrade, Goal } from '@/lib/api'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { getSectionsForChildExpenses } from '@/lib/repositories/expenses.repo'
import { KidDayFillForm } from '@/components/kid/KidDayFillForm'
import { getVacationPeriods } from '@/lib/vacation-api'
import type { Wallet } from '@/lib/models/wallet.types'

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
// Coin calculation constant
// ============================================================================

const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }

// ============================================================================
// Build 7-day array for current week (Mon–Sun)
// ============================================================================

function buildWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

// Russian short day letters Mon=П, Tue=В, Wed=С, Thu=Ч, Fri=П, Sat=С, Sun=В
const RU_DAY_LETTERS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В']

// ============================================================================
// Types
// ============================================================================

type Tab = 'today' | 'week' | 'expenses'

interface Section {
  id: string
  name: string
  cost: number | null
  schedule_days: string[]
}

// ============================================================================
// Page
// ============================================================================

export default function KidDayPage() {
  const { activeMemberId, setActiveMemberId } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')
  const [child, setChild] = useState<Child | null>(null)
  const [todayDay, setTodayDay] = useState<DayData | null>(null)
  const [todayGrades, setTodayGrades] = useState<SubjectGrade[]>([])
  const [streaks, setStreaks] = useState<any[]>([])
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [weekDayCoins, setWeekDayCoins] = useState<Record<string, number>>({})
  const [weekDays, setWeekDays] = useState<string[]>([])
  const [weekStats, setWeekStats] = useState({ roomDays: 0, behaviorDays: 0, gradedDays: 0 })
  const [showFillForm, setShowFillForm] = useState(false)
  const [lastCoinsEarned, setLastCoinsEarned] = useState<number | null>(null)
  const [dayType, setDayType] = useState<'school' | 'weekend' | 'vacation'>('school')
  const [medal, setMedal] = useState<{ message: string; coins: number; sent_by: string | null } | null>(null)

  const today = normalizeDate(new Date())
  const { start: weekStart } = getWeekRange(today)

  const loadData = useCallback(async () => {
    if (!activeMemberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // Resolve child: try activeMemberId first, fall back to first child
      // (activeMemberId may be a stale UUID if user went through onboarding)
      let resolvedId = activeMemberId
      let childData: Child | null = null
      try {
        childData = await api.getChild(activeMemberId)
      } catch {
        const all = await getChildren()
        if (all.length > 0) {
          childData = all[0]
          resolvedId = all[0].id
          setActiveMemberId(resolvedId)
        }
      }
      if (!childData) {
        setLoading(false)
        return
      }

      // Determine day type: weekend by day-of-week, vacation by DB lookup
      const todayDate = new Date(today)
      const dow = todayDate.getDay() // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) {
        setDayType('weekend')
      } else {
        // Check vacation periods for this family
        try {
          const { data: memberRow } = await (await import('@/lib/supabase/client')).createClient()
            .from('family_members')
            .select('family_id')
            .eq('child_id', resolvedId)
            .maybeSingle()
          if (memberRow?.family_id) {
            const periods = await getVacationPeriods(memberRow.family_id)
            const isVacation = periods.some(p =>
              (p.child_filter === 'all' || p.child_filter === resolvedId) &&
              today >= p.start_date && today <= p.end_date
            )
            setDayType(isVacation ? 'vacation' : 'school')
          } else {
            setDayType('school')
          }
        } catch {
          setDayType('school')
        }
      }

      const [dayData, grades, weekRaw, streaksData, goalsData, walletData, sectionsData, medalResult] =
        await Promise.all([
          api.getDay(resolvedId, today),
          api.getSubjectGradesForDate(resolvedId, today),
          api.getWeekData(resolvedId, today),
          api.getStreaks(resolvedId),
          api.getGoals(resolvedId),
          getWallet(resolvedId),
          getSectionsForChildExpenses(resolvedId),
          (async () => {
            try {
              const supabaseClient = (await import('@/lib/supabase/client')).createClient()
              const { data } = await supabaseClient
                .from('medals')
                .select('message, coins, sent_by')
                .eq('child_id', resolvedId)
                .eq('date', today)
                .maybeSingle()
              return data ?? null
            } catch {
              return null
            }
          })(),
        ])

      setChild(childData)
      setTodayDay(dayData)
      setTodayGrades(grades)
      setWallet(walletData)
      setSections(sectionsData)
      setMedal(medalResult)

      // Build 7-day coin map inline from raw data
      const days: DayData[] = weekRaw?.days ?? []
      const weekGrades: SubjectGrade[] = weekRaw?.grades ?? []

      const dayCoins: Record<string, number> = {}
      days.forEach((d: DayData) => {
        const base = (d.room_ok ? 3 : 0) + (d.good_behavior ? 5 : 0)
        dayCoins[d.date] = base
      })
      weekGrades.forEach((g: SubjectGrade) => {
        dayCoins[g.date] = (dayCoins[g.date] ?? 0) + (GRADE_COINS[g.grade] ?? 0)
      })
      setWeekDayCoins(dayCoins)

      // Week stats
      const gradedDates = new Set(weekGrades.map((g: SubjectGrade) => g.date))
      setWeekStats({
        roomDays: days.filter((d: DayData) => d.room_ok).length,
        behaviorDays: days.filter((d: DayData) => d.good_behavior).length,
        gradedDays: gradedDates.size,
      })

      // Week days strip
      setWeekDays(buildWeekDays(weekStart))

      // Active streaks
      const activeStreaks = (streaksData ?? []).filter((s: any) => s.current_count > 0)
      setStreaks(activeStreaks)
      setActiveGoal(goalsData?.active ?? null)
    } catch (err) {
      console.error('KidDayPage: loadData error', err)
    } finally {
      setLoading(false)
    }
  }, [activeMemberId, today, weekStart])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-dismiss celebration after 8 seconds
  useEffect(() => {
    if (lastCoinsEarned === null) return
    const timer = setTimeout(() => setLastCoinsEarned(null), 8000)
    return () => clearTimeout(timer)
  }, [lastCoinsEarned])

  // ========== Loading skeleton ==========
  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="kid-skeleton h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="kid-skeleton h-24 rounded-2xl" />
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

  function handleFormSaved(coinsEarned: number) {
    setShowFillForm(false)
    setLastCoinsEarned(coinsEarned)
    // Reload page data so stats reflect the saved day
    loadData()
  }

  const weekTotal = Object.values(weekDayCoins).reduce((sum, c) => sum + c, 0)
  const totalMonthlyExpenses = sections.reduce((sum, s) => sum + (s.cost ?? 0), 0)

  const fillMode = (child as any)?.kid_fill_mode ?? 1

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-24">

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

        {/* Coin balance row */}
        <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <span className="text-xl">🪙</span>
          <span className="text-white font-extrabold text-lg">{wallet?.coins ?? 0}</span>
          <span className="text-white/80 text-sm">монет</span>
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
          Tab Bar
      ==================================================== */}
      <div className="flex gap-2 bg-gray-100 rounded-full p-1">
        {([
          { key: 'today',    label: 'Сегодня' },
          { key: 'week',     label: 'Неделя'  },
          { key: 'expenses', label: 'Расходы' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'flex-1 py-1.5 rounded-full text-sm font-semibold transition-all',
              tab === key
                ? 'bg-amber-400 text-white font-bold shadow-sm'
                : 'text-gray-500',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ====================================================
          TODAY TAB
      ==================================================== */}
      {tab === 'today' && (
        <>
          {/* Celebration panel */}
          {lastCoinsEarned !== null && (
            <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
              <p className="text-2xl font-extrabold text-white">
                🎉 Отлично! Ты заработал {lastCoinsEarned} монет!
              </p>
              <Link
                href="/kid/wallet"
                className="mt-3 inline-block bg-white text-amber-600 font-bold px-6 py-2 rounded-xl text-sm"
              >
                Посмотреть кошелёк →
              </Link>
            </div>
          )}

          {/* Medal of the Day */}
          {medal && (
            <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🏅</span>
                <span className="font-bold text-yellow-400">Медаль дня</span>
                {medal.sent_by && <span className="text-xs text-gray-400">от {medal.sent_by}</span>}
              </div>
              <p className="text-white text-sm">{medal.message}</p>
              {medal.coins > 0 && (
                <p className="text-yellow-400 text-xs mt-1">+{medal.coins} монет начислено</p>
              )}
            </div>
          )}

          {/* B. 4 stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card 1: Room */}
            <div className={`kid-card text-center ${todayDay?.room_ok ? 'bg-emerald-50' : ''}`}>
              <div className="text-3xl">
                {todayDay?.room_ok ? '✅' : <span className="text-gray-300">❌</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">Комната</p>
              <p className={`text-xs font-semibold mt-0.5 ${todayDay?.room_ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                {todayDay?.room_ok ? '+3💰' : '+0💰'}
              </p>
            </div>

            {/* Card 2: Behavior */}
            <div className={`kid-card text-center ${todayDay?.good_behavior ? 'bg-emerald-50' : ''}`}>
              <div className="text-3xl">
                {todayDay?.good_behavior
                  ? <span className="text-emerald-500">👍</span>
                  : <span className="text-gray-300">👎</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">Поведение</p>
              <p className={`text-xs font-semibold mt-0.5 ${todayDay?.good_behavior ? 'text-emerald-600' : 'text-gray-400'}`}>
                {todayDay?.good_behavior ? '+5💰' : '+0💰'}
              </p>
            </div>

            {/* Card 3: Grades */}
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

            {/* Card 4: Streaks */}
            <div className="kid-card text-center">
              <div className="text-2xl font-extrabold text-orange-500">
                {streaks.length > 0 ? streaks.length : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">🔥 Серии</p>
            </div>
          </div>

          {/* Today grades chips */}
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

          {/* C. Fill form or summary */}
          {todayDay?.filled_by === 'child' && !showFillForm ? (
            <div className="kid-card py-3 flex items-center justify-between">
              <span className="text-base font-semibold text-emerald-600">День заполнен ✅</span>
              <button
                type="button"
                onClick={() => setShowFillForm(true)}
                className="text-xs text-amber-600 font-semibold underline"
              >
                Изменить
              </button>
            </div>
          ) : showFillForm ? (
            <KidDayFillForm
              childId={child?.id ?? activeMemberId ?? ''}
              date={today}
              fillMode={fillMode as 1 | 2 | 3}
              dayType={dayType}
              existingDay={todayDay}
              onSaved={handleFormSaved}
            />
          ) : fillMode ? (
            <button
              type="button"
              onClick={() => setShowFillForm(true)}
              className="kid-hero-gradient w-full py-3 rounded-2xl text-white font-bold text-base shadow-md"
            >
              ✏️ Заполнить сегодня
            </button>
          ) : null}

          {/* E. Active Streaks Bar */}
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

          {/* F. Active Goal Widget */}
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
        </>
      )}

      {/* ====================================================
          WEEK TAB
      ==================================================== */}
      {tab === 'week' && (
        <>
          {/* A. 7-day calendar strip */}
          <div className="kid-card">
            <p className="text-sm font-bold text-gray-700 mb-3">📅 Эта неделя</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {weekDays.map((dateStr) => {
                const d = new Date(dateStr)
                const dayIndex = (d.getDay() + 6) % 7 // Mon=0, Sun=6
                const letter = RU_DAY_LETTERS[dayIndex]
                const dayNum = d.getDate()
                const isToday = dateStr === today
                const coins = weekDayCoins[dateStr]
                const isFilled = coins !== undefined
                const isPast = dateStr < today

                let cellClass = 'rounded-2xl p-2 text-center min-w-[44px] flex-shrink-0 '
                if (isToday) {
                  cellClass += 'bg-amber-400 text-white'
                } else if (isPast && isFilled) {
                  cellClass += 'bg-emerald-50 border border-emerald-200 text-gray-700'
                } else {
                  cellClass += 'bg-white border border-gray-100 text-gray-700'
                }

                return (
                  <div key={dateStr} className={cellClass}>
                    <p className={`text-xs font-bold ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                      {letter}
                    </p>
                    <p className="text-base font-extrabold">{dayNum}</p>
                    {isFilled ? (
                      <p className={`text-xs font-semibold ${coins >= 0 ? 'text-emerald-600' : 'text-rose-500'} ${isToday ? '!text-white' : ''}`}>
                        {coins >= 0 ? '+' : ''}{coins}💰
                      </p>
                    ) : (
                      <p className={`text-xs ${isToday ? 'text-white/70' : 'text-gray-300'}`}>—</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* B. Week summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="kid-card text-center py-3">
              <p className="text-base font-extrabold text-gray-800">{weekStats.roomDays}/7</p>
              <p className="text-xs text-gray-500 mt-0.5">🏠 Комната</p>
            </div>
            <div className="kid-card text-center py-3">
              <p className="text-base font-extrabold text-gray-800">{weekStats.behaviorDays}/7</p>
              <p className="text-xs text-gray-500 mt-0.5">😊 Поведение</p>
            </div>
            <div className="kid-card text-center py-3">
              <p className="text-base font-extrabold text-gray-800">{weekStats.gradedDays}/7</p>
              <p className="text-xs text-gray-500 mt-0.5">📖 Оценки</p>
            </div>
          </div>

          {/* C. Week total */}
          <div className="kid-card text-center py-3">
            <p className="text-lg font-extrabold text-gray-800">
              Итого за неделю: {weekTotal}💰
            </p>
          </div>
        </>
      )}

      {/* ====================================================
          EXPENSES TAB
      ==================================================== */}
      {tab === 'expenses' && (
        <>
          {/* A. Header card */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            <p className="text-xl font-extrabold text-white">Семья тратит на тебя</p>
            <p className="text-white/80 text-sm mt-1">Это инвестиция в твоё будущее 💛</p>
          </div>

          {/* B. Sections list */}
          {sections.length === 0 ? (
            <div className="kid-card py-6 text-center text-gray-400">
              Секций не найдено — спроси родителей
            </div>
          ) : (
            <div className="kid-card">
              <div className="flex flex-col divide-y divide-gray-100">
                {sections.map((section) => (
                  <div key={section.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{section.name}</span>
                      <span className="text-sm font-bold text-amber-600">
                        {section.cost ? `${section.cost} ₽/мес` : 'бесплатно'}
                      </span>
                    </div>
                    {section.schedule_days.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {section.schedule_days.map((day) => (
                          <span
                            key={day}
                            className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. Total monthly */}
          {sections.length > 0 && (
            <div className="kid-card text-center py-3">
              <p className="text-lg font-extrabold text-gray-800">
                Итого в месяц: {totalMonthlyExpenses} ₽
              </p>
            </div>
          )}
        </>
      )}

    </div>
  )
}
