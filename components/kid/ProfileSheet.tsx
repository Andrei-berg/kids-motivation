'use client'

// Bottom sheet opened from the kid ScreenHeader avatar. Self-loads its own data
// from the active member so avatar edits reflect immediately. No route, no nav
// tab (product decision 2026-09-11).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { api } from '@/lib/api'
import type { Child } from '@/lib/models/child.types'
import { getCompletedGoalCount } from '@/lib/repositories/children.repo'
import { levelForXp } from '@/lib/kid/level'
import { getBoostProgress, type BoostProgress } from '@/lib/kid/boost'
import { K } from '@/components/kid/design/kidTheme'
import { Avatar, XPBar, BoostMeter } from '@/components/kid/design/atoms'
import { resolveAvatar, type ChildAvatarFields } from '@/lib/kid/avatar'
import AvatarPicker from '@/components/kid/AvatarPicker'

interface ProfileSheetProps {
  /** Optional seed from the header; the sheet reloads a fresh copy on open. */
  child?: (ChildAvatarFields & { id?: string; name?: string; xp?: number }) | null
  onClose: () => void
}

const STREAK_META: Record<string, { icon: string; labelKey: string }> = {
  room: { icon: '🧹', labelKey: 'kidProfile.streakRoom' },
  study: { icon: '📚', labelKey: 'kidProfile.streakStudy' },
  sport: { icon: '💪', labelKey: 'kidProfile.streakSport' },
  strong_week: { icon: '⭐', labelKey: 'kidProfile.streakBehavior' },
}

export default function ProfileSheet({ child: seed, onClose }: ProfileSheetProps) {
  const t = useT()
  const router = useRouter()
  const { activeMemberId, setActiveMemberId } = useAppStore()
  const [child, setChild] = useState<Child | null>((seed as Child) ?? null)
  const [streaks, setStreaks] = useState<any[]>([])
  const [goalsDone, setGoalsDone] = useState(0)
  const [boost, setBoost] = useState<BoostProgress | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  async function load() {
    if (!activeMemberId) return
    const [c, s, g, b] = await Promise.all([
      api.getChild(activeMemberId).catch(() => null),
      api.getStreaks(activeMemberId).catch(() => []),
      getCompletedGoalCount(activeMemberId).catch(() => 0),
      getBoostProgress(activeMemberId).catch(() => null),
    ])
    if (c) setChild(c)
    setStreaks((s ?? []).filter((x: any) => (x.current_count ?? 0) > 0))
    setGoalsDone(g ?? 0)
    setBoost(b)
  }

  useEffect(() => { load() }, [activeMemberId])

  async function handleLogout() {
    setActiveMemberId(null)
    await supabase.auth.signOut()
    router.push('/')
  }

  const xp = child?.xp ?? 0
  const level = levelForXp(xp)
  const av = resolveAvatar(child)

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33,49,74,0.5)', zIndex: 240,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: K.cream,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          padding: '18px 18px 28px', maxHeight: '90vh', overflowY: 'auto',
          animation: 'slideUp 0.28s cubic-bezier(.2,.9,.3,1.1)',
        }}
      >
        <div style={{ width: 40, height: 4, background: K.line, borderRadius: 999, margin: '0 auto 16px' }} />

        {/* identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar size={76} {...av} />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label={t('kidProfile.changeAvatar')}
              style={{
                position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: '50%',
                border: `2px solid ${K.cream}`, background: K.sky, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: K.fDisp, fontSize: 22, fontWeight: 800, color: K.ink }}>
              {child?.name ?? '…'}
            </div>
            <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.ink3, fontWeight: 600 }}>
              {t('kidProfile.levelLine', { level })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <XPBar xp={xp % 1000} max={1000} level={level} />
        </div>

        {boost && (
          <div style={{ marginTop: 14 }}>
            <BoostMeter earned={boost.week.total} max={boost.week.max} label={boost.week.nextLabel} />
          </div>
        )}

        {/* streaks */}
        {streaks.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: K.fBody, fontSize: 12, fontWeight: 700, color: K.ink3, marginBottom: 8 }}>
              {t('kidProfile.streaksHeading')}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {streaks.map((s: any) => {
                const meta = STREAK_META[s.streak_type] ?? { icon: '🔥', labelKey: 'kidProfile.streakGeneric' }
                return (
                  <div key={s.streak_type} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                    borderRadius: 999, background: K.card, border: `1.5px solid ${K.line}`,
                  }}>
                    <span aria-hidden>{meta.icon}</span>
                    <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink }}>
                      {t(meta.labelKey)}
                    </span>
                    <span style={{ fontFamily: K.fNum, fontSize: 14, fontWeight: 800, color: K.mangoDeep }}>
                      {s.current_count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* stats row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <StatBox value={xp.toLocaleString('ru-RU')} label={t('kidProfile.xpTotal')} />
          <StatBox value={String(goalsDone)} label={t('kidProfile.goalsDone')} />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 20, width: '100%', height: 48, borderRadius: 14, cursor: 'pointer',
            border: `1.5px solid ${K.line}`, background: '#fff', color: K.danger,
            fontFamily: K.fDisp, fontSize: 15, fontWeight: 800,
          }}
        >
          {t('kidNav.logout')}
        </button>
      </div>

      {pickerOpen && (
        <AvatarPicker
          child={child}
          onClose={() => setPickerOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      flex: 1, background: K.card, borderRadius: 16, padding: '12px 14px', border: `1.5px solid ${K.line}`,
    }}>
      <div style={{ fontFamily: K.fNum, fontSize: 20, fontWeight: 800, color: K.ink }}>{value}</div>
      <div style={{ fontFamily: K.fBody, fontSize: 11, fontWeight: 700, color: K.ink3, marginTop: 2 }}>{label}</div>
    </div>
  )
}
