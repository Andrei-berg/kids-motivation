'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getChildBadges } from '@/lib/services/badges.service'
import { triggerGoalConfetti } from '@/utils/confetti'
import { useT } from '@/lib/i18n'

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
        triggerGoalConfetti()
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
      <div className="kid-celebration-badge" style={{
        animation: 'badge-pulse 0.6s ease-out',
        fontSize: '6rem',
        lineHeight: 1,
      }}>
        {newBadge.icon}
      </div>
      <h2 className="text-white text-2xl font-extrabold text-center px-4">{t('celebration.badgeEarned')}</h2>
      <p className="text-white/90 text-lg font-bold text-center">{newBadge.title}</p>
      <div className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full mt-2">
        +{newBadge.xp_reward} XP
      </div>
      <p className="text-white/60 text-xs mt-4">{t('celebration.tapToContinue')}</p>
    </div>
  )
}
