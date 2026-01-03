'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { getChildBadges, getAvailableBadges } from '@/lib/badges'

export default function Records() {
  const [childId, setChildId] = useState('adam')
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  useEffect(() => {
    if (childId) {
      loadBadges()
    }
  }, [childId])

  async function loadBadges() {
    try {
      setLoading(true)
      const earned = await getChildBadges(childId)
      setBadges(earned)
    } catch (err) {
      console.error('Error loading badges:', err)
    } finally {
      setLoading(false)
    }
  }

  const available = getAvailableBadges()
  const earnedKeys = new Set(badges.map(b => b.badge_key))

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
          <div className="h1">🏆 Records</div>
          <div className="muted">Достижения и бейджи</div>
        </div>

        {/* Earned Badges */}
        {badges.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div className="cardH">
              <div className="h">🏆 Полученные бейджи</div>
              <div className="muted">{badges.length} шт</div>
            </div>
            <div className="grid4">
              {badges.map((badge) => (
                <div key={badge.id} className="card" style={{ background: 'var(--emerald-50)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px', textAlign: 'center' }}>
                    {badge.icon}
                  </div>
                  <div className="h" style={{ textAlign: 'center', marginBottom: '4px' }}>
                    {badge.title}
                  </div>
                  <div className="tip" style={{ textAlign: 'center', marginBottom: '8px' }}>
                    {badge.description}
                  </div>
                  <div className="badge gold" style={{ margin: '0 auto' }}>
                    +{badge.xp_reward} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Badges */}
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="cardH">
            <div className="h">🎯 Доступные бейджи</div>
            <div className="muted">ещё не получены</div>
          </div>
          <div className="grid4">
            {available.filter(a => !earnedKeys.has(a.key)).map((badge) => (
              <div key={badge.key} className="card" style={{ opacity: 0.5 }}>
                <div style={{ fontSize: '48px', marginBottom: '8px', textAlign: 'center' }}>
                  {badge.icon}
                </div>
                <div className="h" style={{ textAlign: 'center', marginBottom: '4px' }}>
                  {badge.title}
                </div>
                <div className="tip" style={{ textAlign: 'center', marginBottom: '8px' }}>
                  {badge.description}
                </div>
                <div className="badge" style={{ margin: '0 auto' }}>
                  +{badge.xp} XP
                </div>
              </div>
            ))}
          </div>
        </div>

        {badges.length === 0 && (
          <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
            <div className="h2">Получи первый бейдж!</div>
            <div className="tip" style={{ marginTop: '12px' }}>
              Выполняй задачи и зарабатывай достижения
            </div>
          </div>
        )}
      </div>
    </>
  )
}
