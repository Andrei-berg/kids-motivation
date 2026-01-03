'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavBar() {
  const pathname = usePathname()

  return (
    <div className="nav">
      <div className="navL">
        <div className="brand">Clean MAX v4</div>
        <div className="muted">быстрая навигация • всегда на виду</div>
      </div>

      <div className="navR">
        <Link href="/kid" className={`btn ghost ${pathname === '/kid' ? 'active' : ''}`}>
          👦 Kid
        </Link>
        <Link href="/analytics" className={`btn ghost ${pathname === '/analytics' ? 'active' : ''}`}>
          📊 Analytics
        </Link>
        <Link href="/weekly" className={`btn ghost ${pathname === '/weekly' ? 'active' : ''}`}>
          👨 Weekly
        </Link>
        <Link href="/wallboard" className={`btn ghost ${pathname === '/wallboard' ? 'active' : ''}`}>
          📺 Wallboard
        </Link>
        <Link href="/streaks" className={`btn ghost ${pathname === '/streaks' ? 'active' : ''}`}>
          🔥 Streaks
        </Link>
        <Link href="/records" className={`btn ghost ${pathname === '/records' ? 'active' : ''}`}>
          🏆 Records
        </Link>
      </div>
    </div>
  )
}
