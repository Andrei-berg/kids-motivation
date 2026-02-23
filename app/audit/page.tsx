'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import AuditLogViewer from '@/components/AuditLogViewer'
import { useAppStore } from '@/lib/store'

export default function AuditPage() {
  const { childId } = useAppStore()
  const [loading, setLoading] = useState(false)


  if (loading) {
    return (
      <>
        <NavBar />
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div className="spinner">⏳</div>
          <p>Загрузка истории...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 900, 
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            💼 История операций
          </h1>
          <p style={{ 
            color: 'var(--gray-600)', 
            marginTop: '8px',
            fontSize: '16px'
          }}>
            Полная прозрачность всех финансовых операций
          </p>
        </div>

        <AuditLogViewer 
          childId={childId}
          limit={100}
          showFilters={true}
        />
      </div>
    </>
  )
}
