'use client'

// components/kid/BadgeNudge.tsx
// Sunday-evening "you're almost there" reminder. When the child opens the app on a
// Sunday evening and is ≥60% toward an unearned badge, a friendly card pops once,
// nudging them to finish it. This is the proactive counterpart to the "Ближе всего"
// card on the achievements screen.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { getClosestBadge, type ClosestBadge } from '@/lib/services/badges.service'
import { localDateString } from '@/utils/helpers'
import { T } from '@/components/kid/design/tokens'
import { ProgressRing } from '@/components/kid/design/atoms'
import { useT } from '@/lib/i18n'

const EVENING_HOUR = 17 // 5pm local — "evening"
const MIN_RATIO = 0.6   // only nudge once you're meaningfully close

// Per-badge "remaining" copy — kept in sync with the achievements coach card.
const REMAIN_KEY: Record<string, string> = {
  sportsman: 'achievements.remainSport',
  clean_master: 'achievements.remainRoom',
  study_lover: 'achievements.remainStudy',
  week_excellent: 'achievements.remainFives',
  full_week_grades: 'achievements.remainGradeDays',
  coin_saver: 'achievements.remainCoins',
  streak_30: 'achievements.remainStreak',
  goals_3: 'achievements.remainGoals',
  goals_5: 'achievements.remainGoals',
}

export default function BadgeNudge() {
  const t = useT()
  const router = useRouter()
  const { activeMemberId } = useAppStore()
  const [badge, setBadge] = useState<ClosestBadge | null>(null)

  useEffect(() => {
    if (!activeMemberId) return

    // Not in parent-preview — the nudge is for the kid, and its CTA leaves the
    // preview context. The preview sets a `kid_preview` cookie.
    if (document.cookie.includes('kid_preview=')) return

    const now = new Date()
    // Sunday evening only.
    if (now.getDay() !== 0 || now.getHours() < EVENING_HOUR) return

    // Show at most once per day (so it doesn't re-pop on every navigation/reload).
    const shownKey = `badge_nudge_${activeMemberId}_${localDateString()}`
    if (localStorage.getItem(shownKey)) return

    let cancelled = false
    getClosestBadge(activeMemberId)
      .then(closest => {
        if (cancelled || !closest || closest.ratio < MIN_RATIO) return
        // Don't stack on top of the badge-earned celebration overlay — let it have
        // the moment; the nudge will appear on the next open (still within the day).
        if (document.querySelector('.kid-celebration-overlay')) return
        localStorage.setItem(shownKey, '1')
        setBadge(closest)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [activeMemberId])

  if (!badge) return null

  const remaining = badge.target - badge.current
  const dismiss = () => setBadge(null)

  return (
    <div
      onClick={dismiss}
      role="dialog"
      aria-label={t('achievements.nudgeHeading')}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'fadeIn 0.2s',
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 360, borderRadius: 28, padding: '24px 20px',
        background: `linear-gradient(135deg, ${T.sun} 0%, #FFB35C 45%, ${T.coral} 100%)`,
        boxShadow: '0 18px 48px rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.1)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.16)' }}/>
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: '#fff' }}>
            {t('achievements.nudgeHeading')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <ProgressRing pct={badge.ratio * 100} size={108} stroke={11} color="#fff" bg="rgba(0,0,0,0.18)">
              <div style={{ fontSize: 44 }}>{badge.icon}</div>
            </ProgressRing>
          </div>
          <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 900, color: '#fff', marginTop: 14 }}>
            {t(badge.titleKey)}
          </div>
          <div style={{ fontFamily: T.fBody, fontSize: 14, color: '#fff', fontWeight: 700, marginTop: 4 }}>
            {t(REMAIN_KEY[badge.key] ?? 'achievements.remainGeneric', { n: remaining })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={dismiss} style={{
              flex: 1, height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.22)', color: '#fff',
              fontFamily: T.fDisp, fontSize: 15, fontWeight: 800,
            }}>{t('achievements.nudgeLater')}</button>
            <button onClick={() => { dismiss(); router.push('/kid/achievements') }} style={{
              flex: 2, height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
              background: '#fff', color: T.coral,
              fontFamily: T.fDisp, fontSize: 15, fontWeight: 900,
            }}>{t('achievements.nudgeGo')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
