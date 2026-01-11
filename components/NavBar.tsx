'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function NavBar() {
  const pathname = usePathname()
  const [selectedKid, setSelectedKid] = useState('adam')

  useEffect(() => {
    // Загрузить выбранного ребенка из localStorage
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setSelectedKid(saved)
  }, [])

  const handleKidChange = (kidId: string) => {
    setSelectedKid(kidId)
    localStorage.setItem('v4_selected_kid', kidId)
    window.location.reload() // Обновить страницу
  }

  return (
    <div className="nav">
      <div className="navL">
        <div className="brand">Clean MAX v4.2</div>
        <div className="muted">Silicon Valley Edition</div>
      </div>

      <div className="navR">
        {/* Выбор ребенка */}
        <select 
          value={selectedKid}
          onChange={(e) => handleKidChange(e.target.value)}
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

        {/* Навигация */}
        <Link href="/kid" className={`pill ${pathname === '/kid' ? 'active' : ''}`}>
          👦 Kid
        </Link>
        <Link href="/wallet" className={`pill ${pathname === '/wallet' ? 'active' : ''}`}>
          💰 Кошелёк
        </Link>
        <Link href="/analytics" className={`pill ${pathname === '/analytics' ? 'active' : ''}`}>
          📊 Analytics
        </Link>
        <Link href="/weekly" className={`pill ${pathname === '/weekly' ? 'active' : ''}`}>
          👨 Weekly
        </Link>
        <Link href="/wallboard" className={`pill ${pathname === '/wallboard' ? 'active' : ''}`}>
          📺 Wallboard
        </Link>
        <Link href="/streaks" className={`pill ${pathname === '/streaks' ? 'active' : ''}`}>
          🔥 Streaks
        </Link>
        <Link href="/coach-rating" className={`pill ${pathname === '/coach-rating' ? 'active' : ''}`}>
          💪 Оценка
        </Link>
        <Link href="/records" className={`pill ${pathname === '/records' ? 'active' : ''}`}>
          🏆 Records
        </Link>
        <Link href="/expenses" className={`pill ${pathname === '/expenses' ? 'active' : ''}`}>
          💰 Расходы
        </Link>
        <Link href="/audit" className={`pill ${pathname === '/audit' ? 'active' : ''}`}>
          💼 История
        </Link>
        <Link href="/settings" className={`pill ${pathname === '/settings' ? 'active' : ''}`}>
          ⚙️ Settings
        </Link>
      </div>
    </div>
  )
}
