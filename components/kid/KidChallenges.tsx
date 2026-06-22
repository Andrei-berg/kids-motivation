'use client'

// components/kid/KidChallenges.tsx
// Read-only card on the kid day screen showing challenges a parent set: what to do,
// how long is left, and the reward waiting. The parent marks it done.

import { useState, useEffect } from 'react'
import { getActiveParentGoals, type ParentGoal } from '@/lib/repositories/children.repo'
import { T } from '@/components/kid/design/tokens'
import { useT } from '@/lib/i18n'

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  const d = new Date(deadline + 'T23:59:59')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export function KidChallenges({ childId }: { childId: string }) {
  const t = useT()
  const [goals, setGoals] = useState<ParentGoal[]>([])

  useEffect(() => {
    let alive = true
    getActiveParentGoals(childId).then(g => { if (alive) setGoals(g) }).catch(() => {})
    return () => { alive = false }
  }, [childId])

  if (goals.length === 0) return null

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <h3 style={{ margin: '0 0 10px', fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: T.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
        🎯 {t('kidChallenges.heading')}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map(g => {
          const dl = daysLeft(g.deadline)
          const overdue = dl !== null && dl < 0
          const reward = g.reward_type === 'coins' ? `${g.reward_coins ?? 0} 🪙` : (g.reward_text || '🎁')
          const timeText = dl === null ? null
            : overdue ? t('kidChallenges.overdue')
            : dl === 0 ? t('kidChallenges.lastDay')
            : t('kidChallenges.daysLeft', { n: dl })
          return (
            <div key={g.id} style={{
              borderRadius: 22, padding: 14, position: 'relative', overflow: 'hidden',
              background: `linear-gradient(135deg, ${T.plum} 0%, #5A4BD0 100%)`,
              boxShadow: `0 8px 22px ${T.plum}38`,
            }}>
              <div style={{ position: 'absolute', top: -24, right: -24, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                <div style={{ fontSize: 34 }}>{g.emoji ?? '🎯'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.15 }}>{g.title}</div>
                  <div style={{ fontFamily: T.fBody, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 3 }}>
                    {t('kidChallenges.reward', { reward })}
                  </div>
                </div>
                {timeText && (
                  <div style={{
                    padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap', alignSelf: 'flex-start',
                    background: overdue ? 'rgba(255,90,90,0.3)' : 'rgba(255,255,255,0.2)', color: '#fff',
                    fontFamily: T.fDisp, fontSize: 11, fontWeight: 800,
                  }}>{timeText}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
