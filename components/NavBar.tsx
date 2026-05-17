'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'
import { useT } from '@/lib/i18n'

export default function NavBar() {
  const pathname = usePathname()
  const { activeMemberId, setActiveMemberId } = useAppStore()
  const { members, loading } = useFamilyMembers()
  const t = useT()

  return (
    <div className="nav">
      <div className="navL">
        <div className="brand">Kids v5</div>
        <div className="muted">Family Tracker</div>
      </div>

      <div className="navR">
        {/* Выбор ребенка — динамические pill buttons */}
        {!loading && members.map(member => {
          const avatarDisplay = member.avatar_url && !member.avatar_url.startsWith('http')
            ? member.avatar_url
            : '👦'
          return (
            <button
              key={member.id}
              className={activeMemberId === member.id ? 'btn primary' : 'btn'}
              onClick={() => setActiveMemberId(member.id)}
            >
              {avatarDisplay} {member.display_name}
            </button>
          )
        })}

        {/* Navigation — 5 items */}
        <Link href="/dashboard" className={`pill ${pathname === '/dashboard' ? 'active' : ''}`}>
          🏠 {t('nav.dashboard')}
        </Link>
        <Link href="/wallet" className={`pill ${pathname === '/wallet' ? 'active' : ''}`}>
          💰 {t('nav.wallet')}
        </Link>
        <Link href="/analytics" className={`pill ${pathname === '/analytics' ? 'active' : ''}`}>
          📊 {t('nav.analytics')}
        </Link>
        <Link href="/wallboard" className={`pill ${pathname === '/wallboard' ? 'active' : ''}`}>
          📺 {t('nav.wallboard')}
        </Link>
        <Link href="/expenses" className={`pill ${pathname === '/expenses' ? 'active' : ''}`}>
          💸 {t('nav.expenses')}
        </Link>

        {/* Parent center */}
        <Link href="/parent-dashboard" className={`pill ${pathname === '/parent-dashboard' ? 'active' : ''}`} title={t('nav.parentCenter')}>
          🛡️
        </Link>

        {/* Settings */}
        <Link href="/settings" className={`pill ${pathname === '/settings' ? 'active' : ''}`} title={t('nav.settings')}>
          ⚙️
        </Link>

      </div>
    </div>
  )
}
