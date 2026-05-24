'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { T } from './design/tokens'
import { useT } from '@/lib/i18n'

const TAB_DEFS = [
  { href: '/kid/day',          labelKey: 'kidNav.myDay',    icon: 'home',   color: T.coral  },
  { href: '/kid/wallet',       labelKey: 'kidNav.wallet',   icon: 'wallet', color: T.plum   },
  { href: '/kid/achievements', labelKey: 'kidNav.trophies', icon: 'trophy', color: T.sunDeep },
  { href: '/kid/shop',         labelKey: 'kidNav.shop',     icon: 'shop',   color: T.teal   },
  { href: '/kid/leaderboard',  labelKey: 'kidNav.rating',   icon: 'vs',     color: T.pink   },
]

function TabIcon({ name, active, col }: { name: string; active: boolean; col: string }) {
  const stroke = active ? col : T.ink3
  const w = 26, h = 26
  if (name === 'home') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-5h-6v5H5a1 1 0 01-1-1v-8.5z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round"
        fill={active ? col + '22' : 'none'}/>
    </svg>
  )
  if (name === 'wallet') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v1h-4a3 3 0 000 6h4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round"
        fill={active ? col + '22' : 'none'}/>
      <circle cx="17" cy="12" r="1.2" fill={stroke}/>
    </svg>
  )
  if (name === 'trophy') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"
        fill={active ? col + '22' : 'none'}/>
      <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 15h6M12 13v4M9 20h6" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'shop') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M5 8h14l-1 11a2 2 0 01-2 2H8a2 2 0 01-2-2L5 8z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round"
        fill={active ? col + '22' : 'none'}/>
      <path d="M9 11V7a3 3 0 016 0v4" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'vs') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="12" r="4" stroke={stroke} strokeWidth="2" fill={active ? col + '22' : 'none'}/>
      <circle cx="16" cy="12" r="4" stroke={stroke} strokeWidth="2" fill={active ? col + '22' : 'none'}/>
      <path d="M12 9.5v5" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'chat') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none">
      <path d="M4 6a3 3 0 013-3h10a3 3 0 013 3v7a3 3 0 01-3 3h-4l-4 4v-4H7a3 3 0 01-3-3V6z"
        stroke={stroke} strokeWidth="2" strokeLinejoin="round"
        fill={active ? col + '22' : 'none'}/>
    </svg>
  )
  return null
}

export default function KidNav() {
  const pathname = usePathname()
  const router = useRouter()
  const setActiveMemberId = useAppStore((s) => s.setActiveMemberId)
  const t = useT()

  const TABS = TAB_DEFS.map((tab) => ({ ...tab, label: t(tab.labelKey) }))

  async function handleLogout() {
    setActiveMemberId(null)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed top-0 left-0 bottom-0 z-50 flex-col bg-white border-r border-gray-100 w-16 items-center py-4 gap-2">
        {TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href} title={tab.label}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all"
              style={{ background: isActive ? tab.color + '18' : 'transparent' }}>
              <TabIcon name={tab.icon} active={isActive} col={tab.color}/>
            </Link>
          )
        })}
        {/* Chat tab — desktop only (mobile uses FAB) */}
        {(() => {
          const isActive = pathname === '/kid/chat'
          return (
            <Link href="/kid/chat" title={t('kidNav.chat')}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all"
              style={{ background: isActive ? T.plum + '18' : 'transparent' }}>
              <TabIcon name="chat" active={isActive} col={T.plum}/>
            </Link>
          )
        })()}
        <div className="flex-1"/>
        <button onClick={handleLogout} title={t('kidNav.logout')}
          className="flex items-center justify-center w-10 h-10 rounded-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ padding: '0 10px calc(10px + env(safe-area-inset-bottom, 0px))' }}
        aria-label={t('nav.navigation')}
      >
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 26,
          border: `1.5px solid ${T.line}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)',
          padding: '8px 6px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        }}>
          {TABS.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link key={tab.href} href={tab.href} style={{
                flex: 1, padding: '6px 2px', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                position: 'relative', minHeight: 44,
              }}>
                {isActive && (
                  <div style={{
                    position: 'absolute', top: -8, width: 24, height: 3,
                    borderRadius: 999, background: tab.color,
                  }}/>
                )}
                <TabIcon name={tab.icon} active={isActive} col={tab.color}/>
                <span style={{
                  fontFamily: T.fDisp, fontSize: 10, fontWeight: isActive ? 900 : 700,
                  color: isActive ? tab.color : T.ink3, letterSpacing: 0.3,
                }}>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile logout — top right */}
      <button
        onClick={handleLogout}
        className="lg:hidden fixed top-3 right-3 z-50 flex items-center justify-center"
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
          border: `1.5px solid ${T.line}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          color: T.ink3,
        }}
        aria-label={t('kidNav.logout')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </>
  )
}
