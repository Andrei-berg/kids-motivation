'use client'
import { useT } from '@/lib/i18n'
import { useConnectivity } from '@/lib/use-connectivity'

export function OfflineBanner() {
  const { isOffline } = useConnectivity()
  const t = useT()

  if (!isOffline) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#92400e',
      color: '#fef3c7',
      padding: '10px 16px',
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <span>📡</span>
      <span>{t('offline.banner')}</span>
    </div>
  )
}
