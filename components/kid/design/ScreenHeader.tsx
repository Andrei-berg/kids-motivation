'use client'

// Unified "сберкнижка" header (D-13) — shared across all 5 kid screens.
// Left: Avatar + child name. Right: gold coin balance via the Amount atom.
// The Day-screen variant (`showLogout`) adds a D-03 logout trigger (indigo
// icon, danger-colored confirm dialog). Pulls all colors from lib/design/tokens.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { base, paper } from '@/lib/design/tokens'
import { Amount } from '@/components/design/atoms'
import { Avatar } from '@/components/kid/design/atoms'

interface ScreenHeaderProps {
  title: string
  coins: number
  name: string
  avatarUrl?: string | null
  showLogout?: boolean
}

export default function ScreenHeader({ title, coins, name, avatarUrl, showLogout = false }: ScreenHeaderProps) {
  const t = useT()
  const router = useRouter()
  const setActiveMemberId = useAppStore((s) => s.setActiveMemberId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleLogout() {
    setActiveMemberId(null)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '12px 16px', background: paper.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <Avatar size={44}/>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700, color: paper.ink,
            lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: base.fontBody, fontSize: 12, fontWeight: 600, color: paper.ink3,
            marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {name}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Amount value={coins} theme="paper" money size="lg"/>
        {showLogout && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={t('kidNav.logout')}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer', color: paper.accent,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(36,30,56,0.5)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340, borderRadius: 20, padding: 24,
              background: paper.card, boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700, color: paper.ink }}>
              {t('kidNav.logoutConfirm.title')}
            </div>
            <div style={{
              fontFamily: base.fontBody, fontSize: 14, fontWeight: 500, color: paper.ink2,
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
                  border: `1.5px solid ${paper.line}`, background: paper.card, color: paper.ink,
                  fontFamily: base.fontBody, fontSize: 14, fontWeight: 600,
                }}
              >
                {t('kidNav.logoutConfirm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1, height: 44, borderRadius: 12, cursor: 'pointer', border: 'none',
                  background: paper.dangerText, color: '#fff',
                  fontFamily: base.fontBody, fontSize: 14, fontWeight: 700,
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
