'use client'

// Shared header across all kid screens. Left: avatar (tap → ProfileSheet) +
// child name. Right: coin balance + optional logout (Day screen). New kid
// palette / fonts (components/kid/design/kidTheme.ts) — no parent "family bank"
// tokens here.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { K } from './kidTheme'
import { Avatar, Coin } from './atoms'
import { resolveAvatar, type ChildAvatarFields } from '@/lib/kid/avatar'
import ProfileSheet from '@/components/kid/ProfileSheet'

interface ScreenHeaderProps {
  title: string
  coins: number
  name: string
  /** Child row (or the avatar-relevant subset) — drives the avatar + profile sheet. */
  child?: (ChildAvatarFields & { id?: string; name?: string; xp?: number }) | null
  /** Back-compat: an explicit onboarding photo URL. `child.avatar_url` is preferred. */
  avatarUrl?: string | null
  showLogout?: boolean
}

export default function ScreenHeader({ title, coins, name, child, avatarUrl, showLogout = false }: ScreenHeaderProps) {
  const t = useT()
  const router = useRouter()
  const setActiveMemberId = useAppStore((s) => s.setActiveMemberId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleLogout() {
    setActiveMemberId(null)
    await supabase.auth.signOut()
    router.push('/')
  }

  const av = resolveAvatar(child ?? (avatarUrl ? { avatar_url: avatarUrl } : null))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '12px 16px', background: K.cream,
    }}>
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        aria-label={t('kidProfile.open')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Avatar size={44} {...av} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: K.fDisp, fontSize: 18, fontWeight: 800, color: K.ink,
            lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: K.fBody, fontSize: 12, fontWeight: 600, color: K.ink3,
            marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {name}
          </div>
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px 0 8px',
          borderRadius: 20, background: K.mangoSoft, border: `1.5px solid ${K.mango}55`,
        }}>
          <Coin size={24} />
          <span style={{ fontFamily: K.fNum, fontSize: 18, fontWeight: 800, color: K.ink }}>
            {coins.toLocaleString('ru-RU')}
          </span>
        </div>
        {showLogout && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={t('kidNav.logout')}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer', color: K.sky,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {profileOpen && <ProfileSheet child={child ?? null} onClose={() => setProfileOpen(false)} />}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(33,49,74,0.5)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340, borderRadius: 20, padding: 24,
              background: K.card, boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontFamily: K.fDisp, fontSize: 18, fontWeight: 800, color: K.ink }}>
              {t('kidNav.logoutConfirm.title')}
            </div>
            <div style={{
              fontFamily: K.fBody, fontSize: 14, fontWeight: 500, color: K.ink2,
              marginTop: 8, lineHeight: 1.5,
            }}>
              {t('kidNav.logoutConfirm.body')}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  flex: 1, height: 44, borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${K.line}`, background: K.card, color: K.ink,
                  fontFamily: K.fBody, fontSize: 14, fontWeight: 700,
                }}
              >
                {t('kidNav.logoutConfirm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1, height: 44, borderRadius: 12, cursor: 'pointer', border: 'none',
                  background: K.danger, color: '#fff',
                  fontFamily: K.fBody, fontSize: 14, fontWeight: 700,
                }}
              >
                {t('kidNav.logoutConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
