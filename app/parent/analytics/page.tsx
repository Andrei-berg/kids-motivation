'use client'

import { useState, useEffect } from 'react'
import { getChildren } from '@/lib/repositories/children.repo'
import { getWeekScore } from '@/lib/services/coins.service'
import { supabase } from '@/lib/supabase'
import { getWeekRange, formatDate } from '@/utils/helpers'
import type { Child } from '@/lib/models/child.types'
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
import { Line, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

type WeekScore = {
  coinsFromGrades: number
  coinsFromRoom: number
  coinsFromBehavior: number
  total: number
  gradedDays: number
  roomOkDays: number
  filledDays: number
}

type GradeDist = { 5: number; 4: number; 3: number; 2: number }

export default function ParentAnalytics() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [scores, setScores] = useState<WeekScore[]>([])
  const [weekLabels, setWeekLabels] = useState<string[]>([])
  const [avgGrade, setAvgGrade] = useState<string>('—')
  const [gradeDist, setGradeDist] = useState<GradeDist>({ 5: 0, 4: 0, 3: 0, 2: 0 })
  const [hasGrades, setHasGrades] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load children on mount
  useEffect(() => {
    getChildren()
      .then(list => {
        setChildren(list)
        if (list.length > 0) setSelectedChildId(list[0].id)
      })
      .catch(err => console.error('Failed to load children:', err))
  }, [])

  // Load analytics when selected child changes
  useEffect(() => {
    if (!selectedChildId) return
    loadAnalytics(selectedChildId)
  }, [selectedChildId])

  async function loadAnalytics(childId: string) {
    setLoading(true)
    try {
      // Build array of 8 week starts, oldest first
      const weeks: string[] = []
      for (let i = 7; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i * 7)
        weeks.push(getWeekRange(d).start)
      }

      const rangeStart = weeks[0]
      const rangeEndDate = new Date()
      rangeEndDate.setDate(rangeEndDate.getDate() + 6)
      const rangeEnd = rangeEndDate.toISOString().split('T')[0]

      // Fetch all 8 weeks + grade distribution in parallel
      const [weekScores, gradesResult] = await Promise.all([
        Promise.all(weeks.map(w => getWeekScore(childId, w))),
        supabase
          .from('subject_grades')
          .select('grade,subject')
          .eq('child_id', childId)
          .gte('date', rangeStart)
          .lte('date', rangeEnd)
      ])

      setScores(weekScores)
      setWeekLabels(weeks.map(w => formatDate(w)))

      // Grade distribution
      const allGrades = gradesResult.data ?? []
      const dist: GradeDist = { 5: 0, 4: 0, 3: 0, 2: 0 }
      allGrades.forEach(g => {
        if (g.grade >= 2 && g.grade <= 5) dist[g.grade as 2 | 3 | 4 | 5]++
      })
      setGradeDist(dist)
      setHasGrades(allGrades.length > 0)

      const totalGrades = allGrades.length
      const gradeSum = allGrades.reduce((s, g) => s + g.grade, 0)
      setAvgGrade(totalGrades > 0 ? (gradeSum / totalGrades).toFixed(1) : '—')
    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  // KPI calculations
  const bestWeek = scores.length > 0 ? Math.max(...scores.map(s => s.total)) : 0
  const totalCoins = scores.reduce((sum, s) => sum + s.total, 0)

  // Trend: last 4 weeks vs previous 4 weeks
  const trendIndicator = (() => {
    if (scores.length < 8) return null
    const last4 = scores.slice(4).reduce((sum, s) => sum + s.total, 0) / 4
    const prev4 = scores.slice(0, 4).reduce((sum, s) => sum + s.total, 0) / 4
    if (prev4 === 0) return null
    const pct = Math.round(((last4 - prev4) / Math.abs(prev4)) * 100)
    return pct
  })()

  // Chart data
  const chartData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Монеты',
        data: scores.map(s => s.total),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
      },
    },
  }

  const pieData = {
    labels: ['Отлично (5)', 'Хорошо (4)', 'Удовл (3)', 'Плохо (2)'],
    datasets: [
      {
        data: [gradeDist[5], gradeDist[4], gradeDist[3], gradeDist[2]],
        backgroundColor: ['#22c55e', '#6366f1', '#f59e0b', '#ef4444'],
      },
    ],
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9ca3af', padding: 12, font: { size: 12 } },
      },
    },
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-4">Аналитика</h1>

      {/* Child selector tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              selectedChildId === child.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <span>{child.emoji}</span>
            <span>{child.name}</span>
          </button>
        ))}
      </div>

      {loading ? (
        /* Skeleton */
        <div className="space-y-4">
          <div className="h-48 animate-pulse bg-gray-700 rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 animate-pulse bg-gray-700 rounded-xl" />
            ))}
          </div>
          <div className="h-56 animate-pulse bg-gray-700 rounded-xl" />
        </div>
      ) : (
        <>
          {/* 8-week coin chart */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Монеты за 8 недель</h2>
              {trendIndicator !== null && (
                <span
                  className={`text-sm font-semibold ${
                    trendIndicator >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {trendIndicator >= 0 ? '▲' : '▼'} {trendIndicator >= 0 ? '+' : ''}{trendIndicator}%
                </span>
              )}
            </div>
            <div className="h-48">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-indigo-400">{bestWeek}</div>
              <div className="text-xs text-gray-400 mt-1">Лучшая неделя</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-indigo-400">{avgGrade}</div>
              <div className="text-xs text-gray-400 mt-1">Средний балл</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-indigo-400">{totalCoins}</div>
              <div className="text-xs text-gray-400 mt-1">За 8 недель</div>
            </div>
          </div>

          {/* Grade distribution */}
          <h2 className="text-lg font-semibold text-white mt-6 mb-3">Распределение оценок</h2>
          {hasGrades ? (
            <div className="h-56 bg-gray-800 rounded-xl p-4">
              <Pie data={pieData} options={pieOptions} />
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center mt-4">Оценок за 8 недель нет</p>
          )}
        </>
      )}
    </div>
  )
}
