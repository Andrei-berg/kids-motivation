'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'

export default function Records() {
  const [childId, setChildId] = useState('adam')

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  return (
    <>
      <NavBar />
      <div className="wrap">
        <div className="card">
          <div className="h1">🏆 Records</div>
          <div className="muted">Рекорды и достижения</div>
        </div>

        <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <div className="h2">Скоро здесь будут рекорды!</div>
          <div className="tip" style={{ marginTop: '12px' }}>
            Бейджи за достижения, личные рекорды, статистика
          </div>
          
          <div className="grid4" style={{ marginTop: '32px' }}>
            <div className="card" style={{ opacity: 0.5 }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌟</div>
              <div className="h">Неделя отличника</div>
              <div className="tip">Скоро</div>
            </div>
            <div className="card" style={{ opacity: 0.5 }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧹</div>
              <div className="h">Чистюля</div>
              <div className="tip">Скоро</div>
            </div>
            <div className="card" style={{ opacity: 0.5 }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💪</div>
              <div className="h">Спортсмен</div>
              <div className="tip">Скоро</div>
            </div>
            <div className="card" style={{ opacity: 0.5 }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <div className="h">Целеустремлённый</div>
              <div className="tip">Скоро</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
