'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { paper, base } from '@/lib/design/tokens'
import { useT } from '@/lib/i18n'
import { useDesktop } from '@/lib/hooks/useDesktop'
import { getChatUnreadCount } from '@/lib/repositories/chat.repo'

const TAB_DEFS = [
  { href: '/kid/day',          labelKey: 'kidNav.myDay',  icon: 'home'   },
  { href: '/kid/wallet',       labelKey: 'kidNav.wallet', icon: 'wallet' },
  { href: '/kid/achievements', labelKey: 'kidNav.awards', icon: 'trophy' },
  { href: '/kid/shop',         labelKey: 'kidNav.shop',   icon: 'shop'   },
  { href: '/kid/chat',         labelKey: 'kidNav.chat',   icon: 'chat'   },
]

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? paper.accent : paper.ink3
  const fill = active ? paper.accent + '22' : 'none'
  const w = 26, h = 26
  if (name === 'home') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-5h-6v5H5a1 1 0 01-1-1v-8.5z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill={fill}/>
    </svg>
  )
  if (name === 'wallet') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v1h-4a3 3 0 000 6h4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill={fill}/>
      <circle cx="17" cy="12" r="1.2" fill={stroke}/>
    </svg>
  )
  if (name === 'trophy') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill={fill}/>
      <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 15h6M12 13v4M9 20h6" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'shop') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M5 8h14l-1 11a2 2 0 01-2 2H8a2 2 0 01-2-2L5 8z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill={fill}/>
      <path d="M9 11V7a3 3 0 016 0v4" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'chat') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M4 6a3 3 0 013-3h10a3 3 0 013 3v7a3 3 0 01-3 3h-4l-4 4v-4H7a3 3 0 01-3-3V6z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill={fill}/>
    </svg>
  )
  return null
}

function ChatUnreadBadge({ count, ariaLabel }: { count: number; ariaLabel: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={ariaLabel}
      style={{
        position: 'absolute', top: -2, right: -8,
        minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box',
        borderRadius: 999, background: paper.danger, color: '#fff',
        fontFamily: base.fontBody, fontSize: 10, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function KidNav() {
  const pathname = usePathname()
  const router = useRouter()
  const activeMemberId = useAppStore((s) => s.activeMemberId)
  const setActiveMemberId = useAppStore((s) => s.setActiveMemberId)
  const isDesktop = useDesktop()
  const t = useT()

  const TABS = TAB_DEFS.map((tab) => ({ ...tab, label: t(tab.labelKey) }))

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadUnread() {
      if (!activeMemberId) return
      const { data: member } = await supabase
        .from('family_members')
        .select('id, family_id, chat_last_read_at')
        .eq('child_id', activeMemberId)
        .maybeSingle()
      if (!member || cancelled) return
      const count = await getChatUnreadCount(member.family_id, member.id, member.chat_last_read_at)
      if (!cancelled) setUnreadCount(count)
    }

    loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeMemberId, pathname])

  async function handleLogout() {
    setActiveMemberId(null)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const unreadAria = t('kidNav.unreadAria', { count: unreadCount })

  if (isDesktop) {
    return (
      <nav
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col items-center py-4 gap-2"
        style={{ width: 64, background: paper.card, borderRight: `1px solid ${paper.line}` }}
      >
        {TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href} title={tab.label}
              className="flex items-center justify-center w-12 h-12 rounded-2xl transition-all"
              style={{ background: isActive ? paper.accent + '18' : 'transparent', position: 'relative' }}>
              <TabIcon name={tab.icon} active={isActive}/>
              {tab.href === '/kid/chat' && <ChatUnreadBadge count={unreadCount} ariaLabel={unreadAria}/>}
            </Link>
          )
        })}
        <div className="flex-1"/>
        <button onClick={handleLogout} title={t('kidNav.logout')} aria-label={t('kidNav.logout')}
          className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all"
          style={{ color: paper.accent }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: paper.card,
        borderTop: `1px solid ${paper.line}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label={t('nav.navigation')}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-around', minHeight: 64 }}>
        {TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, minWidth: 44, minHeight: 64, textDecoration: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              <span style={{ position: 'relative', display: 'flex' }}>
                <TabIcon name={tab.icon} active={isActive}/>
                {tab.href === '/kid/chat' && <ChatUnreadBadge count={unreadCount} ariaLabel={unreadAria}/>}
              </span>
              <span style={{
                fontFamily: base.fontBody, fontSize: 10, fontWeight: isActive ? 700 : 500,
                color: isActive ? paper.accent : paper.ink3, letterSpacing: 0.2,
              }}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
