'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api } from '@/lib/api'
import { formatMoney, getWeekRange, addDays, formatDate } from '@/utils/helpers'
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function Analytics() {
  const [childId, setChildId] = useState('adam')
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<any[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [avgGrade, setAvgGrade] = useState(0)
  const [bestWeek, setBestWeek] = useState(0)
  const [gradeDistribution, setGradeDistribution] = useState({ 5: 0, 4: 0, 3: 0, 2: 0 })

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  useEffect(() => {
    if (childId) {
      loadAnalytics()
    }
  }, [childId])

  async function loadAnalytics() {
    try {
      setLoading(true)
      
      // Получить последние 8 недель
      const weeksData = []
      let weekStart = getWeekRange(new Date()).start
      
      for (let i = 0; i < 8; i++) {
        const data = await api.getWeekData(childId, weekStart)
        
        if (data.weekRecord && data.weekRecord.finalized) {
          weeksData.push({
            start: weekStart,
            total: data.weekRecord.total,
            grades: data.grades
          })
        }
        
        weekStart = addDays(weekStart, -7)
      }
      
      setWeeks(weeksData.reverse())
      
      // Рассчитать KPI
      const total = weeksData.reduce((sum, w) => sum + w.total, 0)
      setTotalEarned(total)
      
      const best = Math.max(...weeksData.map(w => w.total), 0)
      setBestWeek(best)
      
      // Распределение оценок
      const allGrades = weeksData.flatMap(w => w.grades)
      const dist = { 5: 0, 4: 0, 3: 0, 2: 0 }
      let sum = 0
      allGrades.forEach(g => {
        if (g.grade >= 2 && g.grade <= 5) {
          dist[g.grade as keyof typeof dist]++
          sum += g.grade
        }
      })
      setGradeDistribution(dist)
      setAvgGrade(allGrades.length > 0 ? sum / allGrades.length : 0)
      
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

  // Данные для графика недель
  const weekChartData = {
    labels: weeks.map(w => formatDate(w.start)),
    datasets: [
      {
        label: 'Заработано (₽)',
        data: weeks.map(w => w.total),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  }

  // Данные для круговой диаграммы оценок
  const gradesPieData = {
    labels: ['5', '4', '3', '2'],
    datasets: [
      {
        data: [
          gradeDistribution[5],
          gradeDistribution[4],
          gradeDistribution[3],
          gradeDistribution[2]
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
      }
    ]
  }

  // Данные для барчарта оценок
  const gradesBarData = {
    labels: ['5', '4', '3', '2'],
    datasets: [
      {
        label: 'Количество',
        data: [
          gradeDistribution[5],
          gradeDistribution[4],
          gradeDistribution[3],
          gradeDistribution[2]
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
      }
    ]
  }

  return (
    <>
      <NavBar />
      <div className="wrap">
        <div className="card">
          <div className="h1">📊 Analytics</div>
          <div className="muted">Статистика и графики</div>
        </div>

        {/* KPI */}
        <div className="grid3" style={{ marginTop: '16px' }}>
          <div className="kpi" style={{ background: 'var(--emerald-50)' }}>
            <div className="lab">Всего заработано</div>
            <div className="val">{formatMoney(totalEarned)}</div>
          </div>
          <div className="kpi" style={{ background: 'var(--blue-50)' }}>
            <div className="lab">Средний балл</div>
            <div className="val">{avgGrade.toFixed(1)}</div>
          </div>
          <div className="kpi" style={{ background: 'var(--amber-50)' }}>
            <div className="lab">Лучшая неделя</div>
            <div className="val">{formatMoney(bestWeek)}</div>
          </div>
        </div>

        {/* График недель */}
        {weeks.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">💰 Заработок по неделям</div>
              <div className="muted">последние 8 недель</div>
            </div>
            <div style={{ height: '300px' }}>
              <Line
                data={weekChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
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
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pie
                data={gradesPieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="cardH">
              <div className="h">📊 Количество оценок</div>
              <div className="muted">столбцы</div>
            </div>
            <div style={{ height: '300px' }}>
              <Bar
                data={gradesBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {weeks.length === 0 && (
          <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div className="h2">Недостаточно данных</div>
            <div className="tip" style={{ marginTop: '12px' }}>
              Закрой хотя бы одну неделю в Weekly Review, чтобы увидеть графики
            </div>
          </div>
        )}
      </div>
    </>
  )
}
