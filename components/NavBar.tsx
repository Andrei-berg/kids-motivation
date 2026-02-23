'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'

export default function NavBar() {
  const pathname = usePathname()
  const { childId, setChildId } = useAppStore()

  return (
    <div className="nav">
      <div className="navL">
        <div className="brand">Kids v5</div>
        <div className="muted">Family Tracker</div>
      </div>

      <div className="navR">
        {/* Выбор ребенка */}
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value as 'adam' | 'alim')}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1.5px solid var(--line)',
            background: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="adam">👦 Адам</option>
          <option value="alim">👶 Алим</option>
        </select>

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

        {/* Settings — иконка в углу */}
        <Link href="/settings" className={`pill ${pathname === '/settings' ? 'active' : ''}`} title="Settings">
          ⚙️
        </Link>
      </div>
    </div>
  )
}
