'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api, Child, Goal } from '@/lib/api'
import { getChildBadges } from '@/lib/badges'
import { formatMoney, calculatePercentage, getWeekRange, normalizeDate } from '@/utils/helpers'

export default function Wallboard() {
  const [children, setChildren] = useState<Child[]>([])
  const [goals, setGoals] = useState<{ [childId: string]: Goal | null }>({})
  const [badges, setBadges] = useState<{ [childId: string]: any[] }>({})
  const [weekProgress, setWeekProgress] = useState<{ [childId: string]: any }>({})
  const [streaks, setStreaks] = useState<{ [childId: string]: any[] }>({})
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadData()
    
    // Auto-refresh каждые 30 секунд
    const interval = setInterval(() => {
      loadData()
    }, 30000)
    
    // Обновление времени каждую секунду
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
    }
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      const kids = await api.getChildren()
      setChildren(kids)
      
      // Загрузить данные для каждого ребенка
      const goalsData: { [childId: string]: Goal | null } = {}
      const badgesData: { [childId: string]: any[] } = {}
      const weekData: { [childId: string]: any } = {}
      const streaksData: { [childId: string]: any[] } = {}
      
      for (const kid of kids) {
        // Цели
        const g = await api.getGoals(kid.id)
        goalsData[kid.id] = g.active
        
        // Бейджи
        const b = await getChildBadges(kid.id)
        badgesData[kid.id] = b.slice(0, 3) // Последние 3
        
        // Прогресс недели
        const today = normalizeDate(new Date())
        const week = await api.getWeekData(kid.id, today)
        const filledDays = week.days.length
        const roomDays = week.days.filter(d => d.room_ok).length
        const gradesCount = week.grades.length
        
        weekData[kid.id] = {
          filledDays,
          roomDays,
          gradesCount,
          progress: Math.min(100, Math.round((filledDays / 7) * 100))
        }
        
        // Стрики
        const s = await api.getStreaks(kid.id)
        streaksData[kid.id] = s.filter(x => x.current_count > 0).slice(0, 3)
      }
      
      setGoals(goalsData)
      setBadges(badgesData)
      setWeekProgress(weekData)
      setStreaks(streaksData)
      
    } catch (err) {
      console.error('Error loading wallboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && children.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto', width: '80px', height: '80px' }} />
          <div style={{ color: '#fff', fontSize: '24px', marginTop: '20px' }}>Загрузка...</div>
        </div>
      </div>
    )
  }

  // Leaderboard
  const sorted = [...children].sort((a, b) => b.xp - a.xp)
  const leader = sorted[0]

  // Дни до воскресенья
  const week = getWeekRange(normalizeDate(new Date()))
  const sunday = new Date(week.end)
  const today = new Date()
  const daysToSunday = Math.ceil((sunday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '40px',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        padding: '30px 40px',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div>
          <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>
            🏆 Family Dashboard
          </div>
          <div style={{ fontSize: '24px', opacity: 0.9 }}>
            Clean MAX — Silicon Valley Edition
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '56px', fontWeight: 700 }}>
            {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: '20px', opacity: 0.8 }}>
            {currentTime.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ fontSize: '18px', opacity: 0.7, marginTop: '8px' }}>
            ⏱️ До воскресенья: {daysToSunday} {daysToSunday === 1 ? 'день' : 'дня'}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {children.length > 1 && (
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          padding: '30px 40px',
          borderRadius: '24px',
          marginBottom: '40px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '20px' }}>
            👑 Лидерборд
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {sorted.map((kid, idx) => (
              <div 
                key={kid.id}
                style={{
                  flex: 1,
                  background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)',
                  padding: '24px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  transform: idx === 0 ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.3s'
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                  {idx === 0 && '🥇'}
                  {idx === 1 && '🥈'}
                  {idx === 2 && '🥉'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>{kid.emoji} {kid.name}</div>
                <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '12px' }}>
                  Level {kid.level}
                </div>
                <div style={{ fontSize: '20px', opacity: 0.9 }}>{kid.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Детские карточки */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: children.length > 1 ? '1fr 1fr' : '1fr',
        gap: '40px'
      }}>
        {children.map(child => {
          const goal = goals[child.id]
          const childBadges = badges[child.id] || []
          const week = weekProgress[child.id]
          const childStreaks = streaks[child.id] || []
          const goalProgress = goal ? calculatePercentage(goal.current, goal.target) : 0

          return (
            <div 
              key={child.id}
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '32px',
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                animation: 'fadeIn 0.5s ease-out'
              }}
            >
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px'
              }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '8px' }}>{child.emoji}</div>
                  <div style={{ fontSize: '42px', fontWeight: 800 }}>{child.name}</div>
                  <div style={{ fontSize: '24px', opacity: 0.9 }}>
                    Level {child.level} • {child.xp} XP
                  </div>
                </div>
                {child.id === leader.id && (
                  <div style={{
                    fontSize: '72px',
                    animation: 'pulse 2s infinite'
                  }}>
                    👑
                  </div>
                )}
              </div>

              {/* XP Progress */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ 
                  fontSize: '20px', 
                  marginBottom: '12px',
                  opacity: 0.9,
                  fontWeight: 600
                }}>
                  ⭐ До {child.level + 1} уровня
                </div>
                <div style={{
                  height: '32px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${((child.xp % 1000) / 1000) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    borderRadius: '16px',
                    transition: 'width 1s ease-out',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '18px',
                    fontWeight: 700,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    {child.xp % 1000} / 1000 XP
                  </div>
                </div>
              </div>

              {/* Активная цель */}
              {goal && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3))',
                  borderRadius: '20px',
                  padding: '24px',
                  marginBottom: '30px',
                  border: '2px solid rgba(251, 191, 36, 0.5)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                    🎯 {goal.title}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>
                    {formatMoney(goal.current)} / {formatMoney(goal.target)}
                  </div>
                  <div style={{
                    height: '24px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${goalProgress}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      borderRadius: '12px',
                      transition: 'width 1s ease-out',
                      boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)'
                    }} />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {goalProgress}% • Осталось {formatMoney(goal.target - goal.current)}
                  </div>
                </div>
              )}

              {/* Прогресс недели */}
              {week && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '20px',
                  padding: '24px',
                  marginBottom: '30px',
                  border: '2px solid rgba(59, 130, 246, 0.4)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
                    📊 Неделя
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '16px', opacity: 0.8 }}>Дней</div>
                      <div style={{ fontSize: '32px', fontWeight: 800 }}>{week.filledDays}/7</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', opacity: 0.8 }}>Комната</div>
                      <div style={{ fontSize: '32px', fontWeight: 800 }}>{week.roomDays}/7</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', opacity: 0.8 }}>Оценки</div>
                      <div style={{ fontSize: '32px', fontWeight: 800 }}>{week.gradesCount}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Активные стрики */}
              {childStreaks.length > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '20px',
                  padding: '24px',
                  marginBottom: '30px',
                  border: '2px solid rgba(239, 68, 68, 0.4)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
                    🔥 Активные стрики
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {childStreaks.map(streak => (
                      <div key={streak.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '12px 20px',
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '18px' }}>
                          {streak.streak_type === 'room' && '🧹 Комната'}
                          {streak.streak_type === 'study' && '📚 Учёба'}
                          {streak.streak_type === 'sport' && '💪 Спорт'}
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800 }}>
                          {streak.current_count} 🔥
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Последние бейджи */}
              {childBadges.length > 0 && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '2px solid rgba(16, 185, 129, 0.4)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
                    🏆 Последние достижения
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {childBadges.map(badge => (
                      <div key={badge.id} style={{
                        flex: 1,
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '16px',
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>{badge.icon}</div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{badge.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
