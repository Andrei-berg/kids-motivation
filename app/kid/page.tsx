'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import DailyModal from '@/components/DailyModal'
import GoalsModal from '@/components/GoalsModal'
import BulkModal from '@/components/BulkModal'
import PotentialWidget from '@/components/PotentialWidget'
import { api, Child, Goal } from '@/lib/api'
import { normalizeDate, formatDate, getWeekRange, addDays, formatMoney, calculatePercentage } from '@/utils/helpers'

export default function KidScreen() {
  const router = useRouter()
  const [childId, setChildId] = useState('')
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [showDaily, setShowDaily] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  
  // Data
  const [todayData, setTodayData] = useState<any>(null)
  const [weekStats, setWeekStats] = useState<any>(null)
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [topSubjects, setTopSubjects] = useState<any[]>([])
  const [streaks, setStreaks] = useState<any[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  useEffect(() => {
    if (childId) {
      loadData()
    }
  }, [childId])

  async function loadData() {
    try {
      setLoading(true)
      
      const today = normalizeDate(new Date())
      const week = getWeekRange(today)
      
      // 1. Ребенок
      const childData = await api.getChild(childId)
      setChild(childData)
      
      // 2. Данные недели
      const weekData = await api.getWeekData(childId, today)
      
      // 3. Статистика недели
      const filledDays = weekData.days.length
      const roomCleanDays = weekData.days.filter(d => d.room_ok).length
      const diaryDoneDays = weekData.days.filter(d => !d.diary_not_done).length
      
      setWeekStats({
        filledDays,
        roomCleanDays,
        diaryDoneDays,
        progress: Math.min(100, Math.round((filledDays / 7) * 100))
      })
      
      // 4. Сегодняшний день
      const todayRecord = weekData.days.find(d => d.date === today)
      setTodayData({
        date: today,
        roomOk: todayRecord?.room_ok || false,
        diaryDone: todayRecord ? !todayRecord.diary_not_done : false,
        filled: !!todayRecord
      })
      
      // 5. Цель
      const goals = await api.getGoals(childId)
      setActiveGoal(goals.active)
      
      // 6. Топ-3 предмета
      const subjectMap: { [subject: string]: { sum: number; count: number } } = {}
      weekData.grades.forEach(g => {
        if (!subjectMap[g.subject]) {
          subjectMap[g.subject] = { sum: 0, count: 0 }
        }
        subjectMap[g.subject].sum += g.grade
        subjectMap[g.subject].count++
      })
      
      const top = Object.entries(subjectMap)
        .map(([subject, { sum, count }]) => ({
          subject,
          avg: sum / count
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
      
      setTopSubjects(top)
      
      // 7. Стрики
      const streaksData = await api.getStreaks(childId)
      setStreaks(streaksData)
      
    } catch (err) {
      console.error('Error loading kid screen:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="wrap">
          <div className="card text-center" style={{ padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div className="h">Загружаю...</div>
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
          </div>
        </div>
      </>
    )
  }

  const goalProgress = activeGoal ? calculatePercentage(activeGoal.current, activeGoal.target) : 0

  return (
    <>
      <NavBar />
      <div className="wrap">
        {/* Header */}
        <div className="card slide-up">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <div className="h1">
                {child.emoji} Привет, {child.name}!
              </div>
              <div className="muted">Уровень {child.level} • {child.xp} XP</div>
            </div>
            <div className="row" style={{ gap: '8px' }}>
              <button className="btn primary" onClick={() => setShowDaily(true)}>
                ➕ Daily
              </button>
              <button className="btn ghost" onClick={() => setShowBulk(true)}>
                🧩 Bulk
              </button>
              <button className="btn ghost" onClick={() => setShowGoals(true)}>
                🎯 Цели
              </button>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="card fade-in" style={{ marginTop: '16px' }}>
          <div className="cardH">
            <div className="h">⭐ Прогресс уровня</div>
            <div className="muted">До {child.level + 1} уровня</div>
          </div>
          <div className="progress">
            <div className="fill" style={{ 
              width: `${((child.xp % 1000) / 1000) * 100}%`,
              background: 'var(--gradient-success)'
            }} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
            <div className="muted">{child.xp % 1000} XP</div>
            <div className="muted">{1000 - (child.xp % 1000)} до следующего</div>
          </div>
        </div>

        {/* Today */}
        <div className="card fade-in" style={{ marginTop: '16px' }}>
          <div className="cardH">
            <div className="h">📅 Сегодня</div>
            <div className="muted">{formatDate(todayData?.date || '')}</div>
          </div>
          <div className="grid2">
            <div className="mini">
              <div className="lab">Комната убрана</div>
              <div className="val">{todayData?.roomOk ? '✅ Да' : '❌ Нет'}</div>
            </div>
            <div className="mini">
              <div className="lab">Дневник заполнен</div>
              <div className="val">{todayData?.diaryDone ? '✅ Да' : '❌ Нет'}</div>
            </div>
          </div>
          {!todayData?.filled && (
            <button 
              className="btn primary" 
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => setShowDaily(true)}
            >
              ➕ Заполнить сегодня
            </button>
          )}
        </div>

        {/* Week Progress */}
        <div className="grid2" style={{ marginTop: '16px' }}>
          <div className="card fade-in">
            <div className="cardH">
              <div className="h">📊 Прогресс недели</div>
              <div className="muted">{weekStats?.filledDays || 0} / 7 дней</div>
            </div>
            <div className="progress" style={{ marginBottom: '12px' }}>
              <div className="fill" style={{ width: `${weekStats?.progress || 0}%` }} />
            </div>
            <div className="grid3">
              <div className="mini">
                <div className="lab">Комната</div>
                <div className="val">{weekStats?.roomCleanDays || 0}</div>
              </div>
              <div className="mini">
                <div className="lab">Дневник</div>
                <div className="val">{weekStats?.diaryDoneDays || 0}</div>
              </div>
              <div className="mini">
                <div className="lab">Заполнено</div>
                <div className="val">{weekStats?.filledDays || 0}</div>
              </div>
            </div>
          </div>

          <div className="card fade-in">
            <div className="cardH">
              <div className="h">💰 Прогноз недели</div>
              <div className="muted">примерно</div>
            </div>
            <div className="kpi" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <div className="lab">Сумма</div>
              <div className="val">{formatMoney(child.base_weekly)}</div>
            </div>
            <div className="tip" style={{ marginTop: '8px' }}>
              Точный расчёт будет в Weekly Review
            </div>
          </div>
        </div>

        {/* Monthly Potential */}
        <div style={{ marginTop: '16px' }}>
          <PotentialWidget 
            childId={childId}
            onDetailsClick={() => router.push(`/potential/${childId}`)}
          />
        </div>

        {/* Active Goal */}
        {activeGoal && (
          <div className="card fade-in" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">🎯 Активная цель</div>
              <div className="muted">{goalProgress}%</div>
            </div>
            <div className="kpi" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
              <div className="lab">{activeGoal.title}</div>
              <div className="val" style={{ 
                background: 'var(--gradient-goal)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {formatMoney(activeGoal.current)} / {formatMoney(activeGoal.target)}
              </div>
            </div>
            <div className="progress" style={{ marginTop: '12px', height: '14px' }}>
              <div className="fill" style={{ 
                width: `${goalProgress}%`,
                background: 'var(--gradient-goal)'
              }} />
            </div>
          </div>
        )}

        {/* Top Subjects */}
        {topSubjects.length > 0 && (
          <div className="card fade-in" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">📚 Топ-3 предмета</div>
              <div className="muted">за неделю</div>
            </div>
            <div className="grid3">
              {topSubjects.map((s, i) => (
                <div key={i} className="mini">
                  <div className="lab">
                    {i === 0 && '🥇 '}
                    {i === 1 && '🥈 '}
                    {i === 2 && '🥉 '}
                    {s.subject}
                  </div>
                  <div className="val">{s.avg.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Streaks */}
        {streaks.length > 0 && (
          <div className="card fade-in" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">🔥 Серии</div>
              <div className="muted">дней подряд</div>
            </div>
            <div className="grid4">
              {streaks.map(streak => (
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
      </div>

      {/* Modals */}
      <DailyModal
        isOpen={showDaily}
        onClose={() => setShowDaily(false)}
        childId={childId}
        date={normalizeDate(new Date())}
        onSave={loadData}
      />

      <GoalsModal
        isOpen={showGoals}
        onClose={() => setShowGoals(false)}
        childId={childId}
      />

      <BulkModal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        childId={childId}
      />
    </>
  )
}
