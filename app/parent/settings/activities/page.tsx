'use client'

import { useRouter } from 'next/navigation'
import ActivitiesManager from '@/components/settings/ActivitiesManager'

export default function ActivitiesPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f13', color: '#e8e8f0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 0',
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(to bottom, #0f0f13 80%, transparent)',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#e8e8f0', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          ←
        </button>
        <div style={{ fontSize: 17, fontWeight: 800 }}>🎯 Активности</div>
      </div>

      <div style={{ padding: '16px' }}>
        <ActivitiesManager />
      </div>
    </div>
  )
}
