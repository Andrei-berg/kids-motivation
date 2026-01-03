'use client'

import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'
import { normalizeDate, formatDate } from '@/utils/helpers'

type KidData = {
  child: {
    id: string
    name: string
    emoji: string
  }
  today: {
    date: string
    roomClean: boolean
    diaryDone: boolean
  }
  weekStats: {
    filledDays: number
    roomCleanDays: number
    diaryDoneDays: number
  }
  weekProgressPct: number
  forecast: {
    forecast: number
  }
  goals: Array<{
    title: string
    target: number
    current: number
    pct: number
  }>
  subjectTop3: Array<{
    subject: string
    avg: number
  }>
}

export default function KidScreen() {
  const [kidId, setKidId] = useState('adam')
  const [data, setData] = useState<KidData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Загрузить выбранного ребенка из localStorage
    const savedKid = localStorage.getItem('v4_kid') || 'adam'
    setKidId(savedKid)
  }, [])

  useEffect(() => {
    if (kidId) {
      loadData()
    }
  }, [kidId])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const today = normalizeDate(new Date())
      
      // Получить данные ребенка
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('*')
        .eq('id', kidId)
        .single()

      if (childError) throw childError

      // Получить данные сегодняшнего дня
      const { data: dayData, error: dayError } = await supabase
        .from('days')
        .select('*')
        .eq('child_id', kidId)
        .eq('date', today)
        .maybeSingle()

      // Получить неделю
      const monday = getMonday(new Date())
      const sunday = addDays(monday, 6)
      
      const { data: weekDays, error: weekError } = await supabase
        .from('days')
        .select('*')
        .eq('child_id', kidId)
        .gte('date', monday)
        .lte('date', sunday)

      if (weekError) throw weekError

      const weekStats = {
        filledDays: weekDays?.length || 0,
        roomCleanDays: weekDays?.filter(d => d.room_clean).length || 0,
        diaryDoneDays: weekDays?.filter(d => d.diary_done).length || 0,
      }

      // Получить активную цель
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('child_id', kidId)
        .eq('active', true)
        .eq('archived', false)
        .limit(1)

      if (goalsError) throw goalsError

      // Получить топ-3 предмета
      const { data: grades, error: gradesError } = await supabase
        .from('subject_grades')
        .select('subject, grade')
        .eq('child_id', kidId)
        .gte('date', monday)
        .lte('date', sunday)

      if (gradesError) throw gradesError

      const subjectAvg: Record<string, { sum: number; count: number }> = {}
      grades?.forEach(g => {
        if (!subjectAvg[g.subject]) {
          subjectAvg[g.subject] = { sum: 0, count: 0 }
        }
        subjectAvg[g.subject].sum += g.grade
        subjectAvg[g.subject].count++
      })

      const subjectTop3 = Object.entries(subjectAvg)
        .map(([subject, { sum, count }]) => ({
          subject,
          avg: sum / count
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)

      setData({
        child: {
          id: child.id,
          name: child.name,
          emoji: child.emoji
        },
        today: {
          date: today,
          roomClean: dayData?.room_clean || false,
          diaryDone: dayData?.diary_done || false
        },
        weekStats,
        weekProgressPct: Math.min(100, Math.round((weekStats.filledDays / 7) * 100)),
        forecast: {
          forecast: child.base_weekly // Упрощенный прогноз
        },
        goals: goals?.map(g => ({
          title: g.title,
          target: g.target,
          current: g.current,
          pct: Math.min(100, Math.round((g.current / g.target) * 100))
        })) || [],
        subjectTop3
      })
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function getMonday(date: Date): string {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return normalizeDate(d)
  }

  function addDays(date: string, days: number): string {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return normalizeDate(d)
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="wrap">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div className="h">Загружаю...</div>
          </div>
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <NavBar />
        <div className="wrap">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div className="h">Ошибка загрузки</div>
            <div className="tip" style={{ marginTop: '8px' }}>{error}</div>
            <button className="btn" style={{ marginTop: '16px' }} onClick={loadData}>
              Попробовать снова
            </button>
          </div>
        </div>
      </>
    )
  }

  const goal = data.goals[0]

  return (
    <>
      <NavBar />
      <div className="wrap">
        {/* Header */}
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <div className="h">
                {data.child.emoji} Привет, {data.child.name}!
              </div>
              <div className="muted">{formatDate(data.today.date)}</div>
            </div>
            <div className="row" style={{ gap: '10px' }}>
              <button className="btn ghost">➕ Daily</button>
              <button className="btn ghost">🎯 Цели</button>
            </div>
          </div>
        </div>

        {/* Today */}
        <div className="card" style={{ marginTop: '14px' }}>
          <div className="cardH">
            <div className="h">📅 Сегодня</div>
            <div className="muted">{formatDate(data.today.date)}</div>
          </div>
          <div className="grid2">
            <div className="mini">
              <div className="lab">Комната убрана</div>
              <div className="val">{data.today.roomClean ? '✅ Да' : '❌ Нет'}</div>
            </div>
            <div className="mini">
              <div className="lab">Дневник заполнен</div>
              <div className="val">{data.today.diaryDone ? '✅ Да' : '❌ Нет'}</div>
            </div>
          </div>
        </div>

        {/* Week Progress */}
        <div className="grid2" style={{ marginTop: '14px' }}>
          <div className="card" style={{ boxShadow: 'none' }}>
            <div className="cardH">
              <div className="h">📊 Прогресс недели</div>
              <div className="muted">{data.weekStats.filledDays} / 7 дней</div>
            </div>
            <div className="bar" style={{ marginBottom: '10px' }}>
              <div className="fill" style={{ width: `${data.weekProgressPct}%` }}></div>
            </div>
            <div className="grid3">
              <div className="mini">
                <div className="lab">Комната</div>
                <div className="val">{data.weekStats.roomCleanDays}</div>
              </div>
              <div className="mini">
                <div className="lab">Дневник</div>
                <div className="val">{data.weekStats.diaryDoneDays}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ boxShadow: 'none' }}>
            <div className="cardH">
              <div className="h">💰 Прогноз недели</div>
              <div className="muted">примерно</div>
            </div>
            <div className="kpi" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <div className="lab">Сумма</div>
              <div className="val">{data.forecast.forecast} ₽</div>
            </div>
          </div>
        </div>

        {/* Goal */}
        {goal && (
          <div className="card" style={{ marginTop: '14px' }}>
            <div className="cardH">
              <div className="h">🎯 Активная цель</div>
              <div className="muted">{goal.pct}%</div>
            </div>
            <div className="kpi" style={{ background: 'rgba(255, 193, 7, 0.12)' }}>
              <div className="lab">{goal.title}</div>
              <div className="val">{goal.current} / {goal.target} ₽</div>
            </div>
            <div className="bar" style={{ marginTop: '10px' }}>
              <div className="fill" style={{ width: `${goal.pct}%`, background: '#fbbf24' }}></div>
            </div>
          </div>
        )}

        {/* Top Subjects */}
        {data.subjectTop3.length > 0 && (
          <div className="card" style={{ marginTop: '14px' }}>
            <div className="cardH">
              <div className="h">📚 Топ-3 предмета</div>
              <div className="muted">за неделю</div>
            </div>
            <div className="grid3">
              {data.subjectTop3.map((s, i) => (
                <div key={i} className="mini">
                  <div className="lab">{s.subject}</div>
                  <div className="val">{s.avg.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="status" id="status"></div>
      </div>
    </>
  )
}
