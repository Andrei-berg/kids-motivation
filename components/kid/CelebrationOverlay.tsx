'use client'

// Badge-earned celebration (D-20): a Stamp ceremony ("ПОЛУЧЕНО") on a paper
// card, not confetti — confetti is reserved for streak/level-up (D-19).

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getChildBadges } from '@/lib/services/badges.service'
import { useT } from '@/lib/i18n'
import { base, paper } from '@/lib/design/tokens'
import { Stamp } from '@/components/design/atoms'

const STORAGE_KEY = 'kid_last_celebration_check'

export default function CelebrationOverlay() {
  const t = useT()
  const { activeMemberId } = useAppStore()
  const [newBadge, setNewBadge] = useState<{
    icon: string
    title: string
    xp_reward: number
  } | null>(null)

  useEffect(() => {
    if (!activeMemberId) return

    async function checkNewBadges() {
      const lastCheck = localStorage.getItem(STORAGE_KEY)
      const lastCheckTime = lastCheck ? new Date(lastCheck).getTime() : 0

      const badges = await getChildBadges(activeMemberId!)
      const recent = badges.find(
        (b: { earned_at: string; icon: string; title: string; xp_reward: number }) =>
          new Date(b.earned_at).getTime() > lastCheckTime
      )

      if (recent) {
        setNewBadge({
          icon: recent.icon,
          title: recent.title,
          xp_reward: recent.xp_reward,
        })
      }

      // Update last check time regardless
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    }

    checkNewBadges()
  }, [activeMemberId])

  function dismiss() {
    setNewBadge(null)
  }

  if (!newBadge) return null

  return (
    <div
      className="kid-celebration-overlay"
      onClick={dismiss}
      role="dialog"
      aria-label={t('celebration.badgeEarned')}
    >
      <div style={{
        width: '100%', maxWidth: 340, background: paper.card,
        border: `1px solid ${paper.line}`, borderRadius: 24,
        padding: '32px 24px', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        animation: 'popIn 0.35s cubic-bezier(.2,.9,.3,1.3)',
      }}>
        <div style={{ fontSize: '5rem', lineHeight: 1 }}>{newBadge.icon}</div>
        <h2 style={{ fontFamily: base.fontDisplay, fontSize: 20, fontWeight: 700, color: paper.ink, marginTop: 12 }}>
          {t('celebration.badgeEarned')}
        </h2>
        <p style={{ fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink2, marginTop: 4 }}>
          {newBadge.title}
        </p>
        {/* D-20: badge earned → Stamp ceremony («ПОЛУЧЕНО», −8° tilt, 450ms), no confetti */}
        <Stamp trigger={newBadge.title} style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <div aria-hidden style={{
            transform: 'rotate(-8deg)',
            border: `3px solid ${paper.successText}`, color: paper.successText,
            borderRadius: 8, padding: '4px 16px',
            fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {t('stamp.received')}
          </div>
        </Stamp>
        <div style={{
          display: 'inline-block', marginTop: 16, padding: '6px 14px', borderRadius: 999,
          background: paper.lineSoft, color: paper.ink2,
          fontFamily: base.fontBody, fontSize: 13, fontWeight: 700,
        }}>
          +{newBadge.xp_reward} XP
        </div>
        <p style={{ fontFamily: base.fontBody, fontSize: 12, color: paper.ink3, marginTop: 16 }}>
          {t('celebration.tapToContinue')}
        </p>
      </div>
    </div>
  )
}
