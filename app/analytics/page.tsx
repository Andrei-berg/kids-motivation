'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api } from '@/lib/api'

export default function Analytics() {
  const [childId, setChildId] = useState('adam')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
    setLoading(false)
  }, [])

  return (
    <>
      <NavBar />
      <div className="wrap">
        <div className="card">
          <div className="h1">📊 Analytics</div>
          <div className="muted">Графики и статистика</div>
        </div>

        <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div className="h2">Скоро здесь будут графики!</div>
          <div className="tip" style={{ marginTop: '12px' }}>
            График по неделям, распределение оценок, прогресс за месяц
          </div>
          
          <div className="grid3" style={{ marginTop: '32px' }}>
            <div className="kpi" style={{ background: 'var(--emerald-50)' }}>
              <div className="lab">Всего заработано</div>
              <div className="val">— ₽</div>
            </div>
            <div className="kpi" style={{ background: 'var(--blue-50)' }}>
              <div className="lab">Средний балл</div>
              <div className="val">—</div>
            </div>
            <div className="kpi" style={{ background: 'var(--amber-50)' }}>
              <div className="lab">Лучшая неделя</div>
              <div className="val">— ₽</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
