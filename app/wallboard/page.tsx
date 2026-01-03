'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api, Child, Goal } from '@/lib/api'
import { formatMoney, calculatePercentage } from '@/utils/helpers'

export default function Wallboard() {
  const [children, setChildren] = useState<Child[]>([])
  const [goals, setGoals] = useState<{ [childId: string]: Goal | null }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      const kids = await api.getChildren()
      setChildren(kids)
      
      // Загрузить цели для каждого ребенка
      const goalsData: { [childId: string]: Goal | null } = {}
      for (const kid of kids) {
        const g = await api.getGoals(kid.id)
        goalsData[kid.id] = g.active
      }
      setGoals(goalsData)
      
    } catch (err) {
      console.error('Error loading wallboard:', err)
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

  return (
    <>
      <NavBar />
      <div className="wrap">
        <div className="card">
          <div className="h1">📺 Wallboard</div>
          <div className="muted">Общий экран для всей семьи</div>
        </div>

        <div className="grid2" style={{ marginTop: '16px' }}>
          {children.map(child => {
            const goal = goals[child.id]
            const progress = goal ? calculatePercentage(goal.current, goal.target) : 0
            
            return (
              <div key={child.id} className="card">
                <div className="cardH">
                  <div className="h">
                    {child.emoji} {child.name}
                  </div>
                  <div className="muted">Level {child.level}</div>
                </div>

                {/* XP Progress */}
                <div className="mini" style={{ marginBottom: '12px' }}>
                  <div className="lab">XP прогресс</div>
                  <div className="progress" style={{ marginTop: '6px' }}>
                    <div className="fill" style={{ 
                      width: `${((child.xp % 1000) / 1000) * 100}%` 
                    }} />
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: '4px' }}>
                    <div className="tip">{child.xp % 1000} XP</div>
                    <div className="tip">{1000 - (child.xp % 1000)} до {child.level + 1}</div>
                  </div>
                </div>

                {/* Goal */}
                {goal && (
                  <div className="mini">
                    <div className="lab">🎯 {goal.title}</div>
                    <div className="progress" style={{ marginTop: '8px', height: '12px' }}>
                      <div className="fill" style={{ 
                        width: `${progress}%`,
                        background: 'var(--gradient-goal)'
                      }} />
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', marginTop: '6px' }}>
                      <div className="tip">{formatMoney(goal.current)}</div>
                      <div className="tip">{progress}%</div>
                      <div className="tip">{formatMoney(goal.target)}</div>
                    </div>
                  </div>
                )}

                {/* This Week */}
                <div className="mini" style={{ marginTop: '12px' }}>
                  <div className="lab">💰 Эта неделя (прогноз)</div>
                  <div className="val">{formatMoney(child.base_weekly)}</div>
                </div>
              </div>
            )
          })}
        </div>

        {children.length === 0 && (
          <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👦‍👦</div>
            <div className="h2">Нет детей</div>
            <div className="tip" style={{ marginTop: '12px' }}>
              Добавь детей в Supabase
            </div>
          </div>
        )}
      </div>
    </>
  )
}
