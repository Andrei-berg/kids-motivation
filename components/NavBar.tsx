'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'

export default function NavBar() {
  const pathname = usePathname()
  const { activeMemberId, setActiveMemberId } = useAppStore()
  const { members, loading } = useFamilyMembers()

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

        {/* Навигация — 5 пунктов */}
        <Link href="/dashboard" className={`pill ${pathname === '/dashboard' ? 'active' : ''}`}>
          🏠 Dashboard
        </Link>
        <Link href="/wallet" className={`pill ${pathname === '/wallet' ? 'active' : ''}`}>
          💰 Кошелёк
        </Link>
        <Link href="/analytics" className={`pill ${pathname === '/analytics' ? 'active' : ''}`}>
          📊 Analytics
        </Link>
        <Link href="/wallboard" className={`pill ${pathname === '/wallboard' ? 'active' : ''}`}>
          📺 Wallboard
        </Link>
        <Link href="/expenses" className={`pill ${pathname === '/expenses' ? 'active' : ''}`}>
          💸 Расходы
        </Link>

        {/* Родительский центр */}
        <Link href="/parent-dashboard" className={`pill ${pathname === '/parent-dashboard' ? 'active' : ''}`} title="Родительский центр">
          🛡️
        </Link>

        {/* Settings — иконка в углу */}
        <Link href="/settings" className={`pill ${pathname === '/settings' ? 'active' : ''}`} title="Settings">
          ⚙️
        </Link>
      </div>
    </div>
  )
}
