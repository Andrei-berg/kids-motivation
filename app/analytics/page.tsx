'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { getWeekRange, addDays, formatDate } from '@/utils/helpers'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Pie, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

export default function Analytics() {
  const { childId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<any[]>([])
  const [totalCoins, setTotalCoins] = useState(0)
  const [avgGrade, setAvgGrade] = useState(0)
  const [bestWeek, setBestWeek] = useState(0)
  const [gradeDistribution, setGradeDistribution] = useState({ 5: 0, 4: 0, 3: 0, 2: 0 })

  useEffect(() => {
    loadAnalytics()
  }, [childId])

  async function loadAnalytics() {
    try {
      setLoading(true)

      // Загрузить последние 8 недель напрямую из raw-данных (без требования финализации)
      const weeksData: any[] = []
      let weekStart = getWeekRange(new Date()).start

      for (let i = 0; i < 8; i++) {
        const [weekData, weekScore] = await Promise.all([
          api.getWeekData(childId, weekStart),
          api.getWeekScore(childId, weekStart)
        ])

        // Включаем неделю если есть хоть один день с данными
        if (weekData.days.length > 0 || weekData.grades.length > 0) {
          weeksData.push({
            start: weekStart,
            total: weekScore.total,
            coinsFromGrades: weekScore.coinsFromGrades,
            coinsFromRoom: weekScore.coinsFromRoom,
            coinsFromBehavior: weekScore.coinsFromBehavior,
            filledDays: weekScore.filledDays,
            grades: weekData.grades
          })
        }

        weekStart = addDays(weekStart, -7)
      }

      setWeeks(weeksData.reverse())

      // KPI
      const total = weeksData.reduce((sum, w) => sum + w.total, 0)
      setTotalCoins(total)

      const best = Math.max(...weeksData.map(w => w.total), 0)
      setBestWeek(best)

      const allGrades = weeksData.flatMap(w => w.grades)
      const dist = { 5: 0, 4: 0, 3: 0, 2: 0 }
      let gradeSum = 0
      allGrades.forEach((g: any) => {
        if (g.grade >= 2 && g.grade <= 5) {
          dist[g.grade as keyof typeof dist]++
          gradeSum += g.grade
        }
      })
      setGradeDistribution(dist)
      setAvgGrade(allGrades.length > 0 ? gradeSum / allGrades.length : 0)

    } catch (err) {
      console.error('Error loading analytics:', err)
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
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        </div>
      </>
    )
  }

  const weekChartData = {
    labels: weeks.map(w => formatDate(w.start)),
    datasets: [
      {
        label: 'Монеты за неделю',
        data: weeks.map(w => w.total),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  }

  const gradesPieData = {
    labels: ['5', '4', '3', '2'],
    datasets: [{
      data: [gradeDistribution[5], gradeDistribution[4], gradeDistribution[3], gradeDistribution[2]],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    }]
  }

  const gradesBarData = {
    labels: ['5', '4', '3', '2'],
    datasets: [{
      label: 'Количество',
      data: [gradeDistribution[5], gradeDistribution[4], gradeDistribution[3], gradeDistribution[2]],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    }]
  }

  return (
    <>
      <NavBar />
      <div className="wrap">
        <div className="card">
          <div className="h1">📊 Analytics</div>
          <div className="muted">Статистика по реальным данным (не требует финализации)</div>
        </div>

        {/* KPI */}
        <div className="grid3" style={{ marginTop: '16px' }}>
          <div className="kpi" style={{ background: 'var(--emerald-50)' }}>
            <div className="lab">Всего монет</div>
            <div className="val">{totalCoins}</div>
          </div>
          <div className="kpi" style={{ background: 'var(--blue-50)' }}>
            <div className="lab">Средний балл</div>
            <div className="val">{avgGrade.toFixed(1)}</div>
          </div>
          <div className="kpi" style={{ background: 'var(--amber-50)' }}>
            <div className="lab">Лучшая неделя</div>
            <div className="val">{bestWeek}</div>
          </div>
        </div>

        {/* График недель */}
        {weeks.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">💰 Монеты по неделям</div>
              <div className="muted">последние 8 недель</div>
            </div>
            <div style={{ height: '300px' }}>
              <Line data={weekChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        )}

        {/* Разбивка по неделям */}
        {weeks.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">📋 Детализация</div>
              <div className="muted">по составляющим</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>Неделя</th>
                    <th style={{ padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>Дни</th>
                    <th style={{ padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>Оценки</th>
                    <th style={{ padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>Комната</th>
                    <th style={{ padding: '8px 12px', color: 'var(--gray-500)', fontWeight: 500 }}>Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 12px' }}>{formatDate(w.start)}</td>
                      <td style={{ padding: '8px 12px' }}>{w.filledDays}/7</td>
                      <td style={{ padding: '8px 12px', color: w.coinsFromGrades >= 0 ? '#10b981' : '#ef4444' }}>
                        {w.coinsFromGrades >= 0 ? '+' : ''}{w.coinsFromGrades}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#10b981' }}>+{w.coinsFromRoom}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: w.total >= 0 ? '#10b981' : '#ef4444' }}>
                        {w.total >= 0 ? '+' : ''}{w.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Графики оценок */}
        <div className="grid2" style={{ marginTop: '16px' }}>
          <div className="card">
            <div className="cardH">
              <div className="h">📊 Распределение оценок</div>
              <div className="muted">круговая</div>
            </div>
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pie data={gradesPieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
          <div className="card">
            <div className="cardH">
              <div className="h">📊 Количество оценок</div>
              <div className="muted">столбцы</div>
            </div>
            <div style={{ height: '280px' }}>
              <Bar data={gradesBarData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>
        </div>

        {weeks.length === 0 && (
          <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div className="h2">Нет данных</div>
            <div className="tip" style={{ marginTop: '12px' }}>
              Начните заполнять дни в Dashboard, чтобы увидеть статистику
            </div>
          </div>
        )}
      </div>
    </>
  )
}
