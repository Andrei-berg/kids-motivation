'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import DailyModal from '@/components/DailyModal'
import GoalsModal from '@/components/GoalsModal'
import { api, Child, Goal } from '@/lib/api'
import { getChildBadges } from '@/lib/badges'
import { useAppStore } from '@/lib/store'
import { normalizeDate, formatDate, getWeekRange, addDays } from '@/utils/helpers'

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function getDaysOfWeek(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export default function Dashboard() {
  const { activeMemberId } = useAppStore()
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)

  const [showDaily, setShowDaily] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date()))

  const [todayData, setTodayData] = useState<any>(null)
  const [weekDays, setWeekDays] = useState<any[]>([])
  const [weekScore, setWeekScore] = useState<any>(null)
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [streaks, setStreaks] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [showAllBadges, setShowAllBadges] = useState(false)

  useEffect(() => {
    if (!activeMemberId) return
    loadData()
  }, [activeMemberId])

  async function loadData() {
    if (!activeMemberId) return
    try {
      setLoading(true)
      const today = normalizeDate(new Date())
      const week = getWeekRange(today)

      // Сначала загружаем ребёнка — критично
      const childData = await api.getChild(activeMemberId!)
      setChild(childData)

      // Остальное — параллельно, каждый с fallback чтобы один сбой не ломал всё
      const [weekData, goalsData, streaksData, badgesData, weekScoreData] = await Promise.all([
        api.getWeekData(activeMemberId!, today).catch(() => ({ days: [], grades: [], sports: [], weekRecord: null })),
        api.getGoals(activeMemberId!).catch(() => ({ active: null, archived: [], all: [] })),
        api.getStreaks(activeMemberId!).catch(() => []),
        getChildBadges(activeMemberId!).catch(() => []),
        api.getWeekScore(activeMemberId!, week.start).catch(() => ({ coinsFromGrades: 0, coinsFromRoom: 0, coinsFromBehavior: 0, total: 0, filledDays: 0, gradedDays: 0, roomOkDays: 0 }))
      ])

      setWeekScore(weekScoreData)
      setActiveGoal(goalsData.active)
      setStreaks(streaksData)
      setBadges(badgesData)

      const daysOfWeek = getDaysOfWeek(week.start)
      const dayMap: Record<string, any> = {}
      weekData.days.forEach((d: any) => { dayMap[d.date] = d })

      setWeekDays(daysOfWeek.map((date, i) => ({
        date,
        label: DAY_LABELS[i],
        isToday: date === today,
        isFuture: date > today,
        dayData: dayMap[date] || null
      })))

      const todayRecord = dayMap[today]
      const todayGrades = weekData.grades.filter((g: any) => g.date === today)
      setTodayData({
        date: today,
        filled: !!todayRecord,
        roomOk: todayRecord?.room_ok || false,
        goodBehavior: todayRecord?.good_behavior ?? true,
        gradesCount: todayGrades.length
      })

    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const xpInLevel = child ? child.xp % 1000 : 0
  const xpPercent = Math.round((xpInLevel / 1000) * 100)
  const goalPercent = activeGoal ? Math.min(100, Math.round((activeGoal.current / activeGoal.target) * 100)) : 0

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="wrap">
          <div className="card text-center" style={{ padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        </div>
      </>
    )
  }

  if (!child) {
    return (
      <>
        <NavBar />
        <div className="wrap">
          <div className="card text-center" style={{ padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div className="h">Ребенок не найден</div>
            <div className="muted" style={{ marginTop: '8px', fontSize: '13px' }}>
              Проверь подключение к Supabase и наличие записей в таблице children (id: adam / alim)
            </div>
            <button className="btn primary" style={{ marginTop: '16px' }} onClick={loadData}>
              Повторить
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <div className="wrap">

        {/* ── HERO ──────────────────────────────────────────── */}
        <div className="dashboard-hero slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '36px', marginBottom: '4px' }}>{child.emoji}</div>
              <div className="h1" style={{ marginBottom: '4px' }}>{child.name}</div>
              <div className="muted">Уровень {child.level} · {child.xp} XP</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <button className="btn primary" onClick={() => { setSelectedDate(normalizeDate(new Date())); setShowDaily(true) }}>
                ➕ Заполнить день
              </button>
              <button className="btn ghost" onClick={() => setShowGoals(true)}>🎯 Цели</button>
            </div>
          </div>
          {/* XP bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="muted" style={{ fontSize: '13px' }}>До уровня {child.level + 1}</span>
              <span className="muted" style={{ fontSize: '13px' }}>{xpInLevel} / 1000 XP</span>
            </div>
            <div className="progress">
              <div className="fill" style={{ width: `${xpPercent}%`, background: 'var(--gradient-success)' }} />
            </div>
          </div>
        </div>

        {/* ── СЕГОДНЯ ──────────────────────────────────────── */}
        <div className="card fade-in" style={{ marginTop: '16px' }}>
          <div className="cardH">
            <div className="h">📅 Сегодня</div>
            <div className="muted">{formatDate(normalizeDate(new Date()))}</div>
          </div>
          <div className="day-status-grid">
            <div className={`day-status-item ${todayData?.gradesCount > 0 ? 'ok' : 'empty'}`}>
              <div className="day-status-icon">📚</div>
              <div className="day-status-label">Оценки</div>
              <div className="day-status-val">{todayData?.gradesCount || 0}</div>
            </div>
            <div className={`day-status-item ${todayData?.roomOk ? 'ok' : todayData?.filled ? 'warn' : 'empty'}`}>
              <div className="day-status-icon">🏠</div>
              <div className="day-status-label">Комната</div>
              <div className="day-status-val">{todayData?.roomOk ? '✓' : todayData?.filled ? '✗' : '–'}</div>
            </div>
            <div className={`day-status-item ${todayData?.filled && todayData?.goodBehavior ? 'ok' : todayData?.filled ? 'warn' : 'empty'}`}>
              <div className="day-status-icon">😊</div>
              <div className="day-status-label">Поведение</div>
              <div className="day-status-val">{todayData?.filled ? (todayData?.goodBehavior ? '✓' : '✗') : '–'}</div>
            </div>
            <div className={`day-status-item ${todayData?.filled ? 'ok' : 'empty'}`}>
              <div className="day-status-icon">✅</div>
              <div className="day-status-label">Заполнен</div>
              <div className="day-status-val">{todayData?.filled ? '✓' : '–'}</div>
            </div>
          </div>
          {!todayData?.filled && (
            <button className="btn primary" style={{ marginTop: '12px', width: '100%' }} onClick={() => { setSelectedDate(normalizeDate(new Date())); setShowDaily(true) }}>
              ➕ Заполнить сегодня
            </button>
          )}
        </div>

        {/* ── НЕДЕЛЯ ────────────────────────────────────────── */}
        <div className="card fade-in" style={{ marginTop: '16px' }}>
          <div className="cardH">
            <div className="h">📊 Эта неделя</div>
            {weekScore && (
              <div className="muted">{weekScore.filledDays}/7 дней · {weekScore.total >= 0 ? '+' : ''}{weekScore.total} монет</div>
            )}
          </div>
          <div className="week-calendar">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`week-day${day.isToday ? ' today' : ''}${day.isFuture ? ' future' : ''}${day.dayData ? ' filled' : ''}`}
                onClick={() => { if (!day.isFuture) { setSelectedDate(day.date); setShowDaily(true) } }}
                title={day.date}
              >
                <div className="week-day-label">{day.label}</div>
                <div className="week-day-dot">
                  {day.dayData ? (day.dayData.room_ok ? '✓' : '·') : (day.isFuture ? '' : '○')}
                </div>
              </div>
            ))}
          </div>
          {weekScore && (
            <div className="grid3" style={{ marginTop: '12px' }}>
              <div className="mini">
                <div className="lab">Оценки</div>
                <div className="val" style={{ color: weekScore.coinsFromGrades >= 0 ? '#10b981' : '#ef4444' }}>
                  {weekScore.coinsFromGrades >= 0 ? '+' : ''}{weekScore.coinsFromGrades}
                </div>
              </div>
              <div className="mini">
                <div className="lab">Комната</div>
                <div className="val" style={{ color: '#10b981' }}>+{weekScore.coinsFromRoom}</div>
              </div>
              <div className="mini">
                <div className="lab">Поведение</div>
                <div className="val" style={{ color: '#10b981' }}>+{weekScore.coinsFromBehavior}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── ЦЕЛЬ ─────────────────────────────────────────── */}
        {activeGoal && (
          <div className="card fade-in" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">🎯 Активная цель</div>
              <div className="muted">{goalPercent}%</div>
            </div>
            <div className="kpi" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
              <div className="lab">{activeGoal.title}</div>
              <div className="val" style={{ background: 'var(--gradient-goal)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {activeGoal.current} / {activeGoal.target} монет
              </div>
            </div>
            <div className="progress" style={{ marginTop: '12px', height: '10px' }}>
              <div className="fill" style={{ width: `${goalPercent}%`, background: 'var(--gradient-goal)' }} />
            </div>
          </div>
        )}

        {/* ── СЕРИИ ────────────────────────────────────────── */}
        {streaks.length > 0 && (
          <div className="card fade-in" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">🔥 Серии</div>
              <div className="muted">дней подряд</div>
            </div>
            <div className="grid4">
              {streaks.map((streak: any) => (
                <div key={streak.id} className="mini">
                  <div className="lab">
                    {streak.streak_type === 'room' && '🧹 Комната'}
                    {streak.streak_type === 'study' && '📚 Учёба'}
                    {streak.streak_type === 'sport' && '💪 Спорт'}
                    {streak.streak_type === 'strong_week' && '👑 Сильная'}
                  </div>
                  <div className="val">{streak.current_count} 🔥</div>
                  <div className="tip">Рекорд: {streak.best_count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── БЕЙДЖИ ───────────────────────────────────────── */}
        {badges.length > 0 && (
          <div className="card fade-in" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">🏅 Достижения</div>
              <button className="btn ghost" style={{ fontSize: '13px', padding: '4px 10px' }} onClick={() => setShowAllBadges(!showAllBadges)}>
                {showAllBadges ? 'Свернуть' : `Все (${badges.length})`}
              </button>
            </div>
            <div className="grid4">
              {(showAllBadges ? badges : badges.slice(0, 4)).map((badge: any, i: number) => (
                <div key={i} className="mini" title={badge.description}>
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{badge.icon}</div>
                  <div className="lab">{badge.title}</div>
                  <div className="tip">+{badge.xp_reward} XP</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <DailyModal
        isOpen={showDaily}
        onClose={() => setShowDaily(false)}
        childId={activeMemberId ?? ''}
        date={selectedDate}
        onSave={loadData}
      />

      <GoalsModal
        isOpen={showGoals}
        onClose={() => setShowGoals(false)}
        childId={activeMemberId ?? ''}
      />
    </>
  )
}
