'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api } from '@/lib/api'

export default function SuperStreaks() {
  const [childId, setChildId] = useState('adam')
  const [streaks, setStreaks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  useEffect(() => {
    if (childId) {
      loadStreaks()
    }
  }, [childId])

  async function loadStreaks() {
    try {
      setLoading(true)
      const data = await api.getStreaks(childId)
      setStreaks(data)
    } catch (err) {
      console.error('Error loading streaks:', err)
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
          <div className="h1">🔥 Super Streaks</div>
          <div className="muted">Серии дней подряд и достижения</div>
        </div>

        <div className="grid2" style={{ marginTop: '16px' }}>
          {streaks.map(streak => {
            const isActive = streak.current_count > 0
            
            return (
              <div 
                key={streak.id} 
                className="card"
                style={{
                  background: isActive ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : undefined
                }}
              >
                <div className="cardH">
                  <div className="h">
                    {streak.streak_type === 'room' && '🧹 Комната'}
                    {streak.streak_type === 'study' && '📚 Учёба'}
                    {streak.streak_type === 'sport' && '💪 Спорт'}
                    {streak.streak_type === 'strong_week' && '👑 Сильная неделя'}
                  </div>
                  <div className="badge gold">
                    {isActive ? '🔥 Активна' : '💤 Спит'}
                  </div>
                </div>

                <div className="grid2">
                  <div className="mini">
                    <div className="lab">Текущая серия</div>
                    <div className="val" style={{ fontSize: '32px' }}>
                      {streak.current_count} 🔥
                    </div>
                  </div>
                  <div className="mini">
                    <div className="lab">Рекорд</div>
                    <div className="val" style={{ fontSize: '32px' }}>
                      {streak.best_count} 🏆
                    </div>
                  </div>
                </div>

                {streak.current_count >= 7 && (
                  <div className="tip" style={{ marginTop: '12px', color: '#f59e0b' }}>
                    🎉 Отличная серия! Продолжай!
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {streaks.length === 0 && (
          <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔥</div>
            <div className="h2">Начни серию!</div>
            <div className="tip" style={{ marginTop: '12px' }}>
              Заполняй дни подряд и зарабатывай бонусы за стрики
            </div>
          </div>
        )}
      </div>
    </>
  )
}
