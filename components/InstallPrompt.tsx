'use client'

import { useEffect, useState, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIOS, setShowIOS] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Don't show anything if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      const dismissed = localStorage.getItem('pwa_ios_dismissed')
      if (!dismissed) {
        setShowIOS(true)
      }
      return
    }

    // Android Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      const dismissed = localStorage.getItem('pwa_install_dismissed')
      if (!dismissed) {
        deferredPrompt.current = e as BeforeInstallPromptEvent
        setShowAndroid(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const choice = await deferredPrompt.current.userChoice
    if (choice.outcome === 'accepted') {
      localStorage.setItem('pwa_install_dismissed', '1')
    }
    deferredPrompt.current = null
    setShowAndroid(false)
  }

  const handleAndroidDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', '1')
    setShowAndroid(false)
  }

  const handleIOSDismiss = () => {
    localStorage.setItem('pwa_ios_dismissed', '1')
    setShowIOS(false)
  }

  if (!showAndroid && !showIOS) return null

  const bannerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#1e1b4b',
    color: '#fff',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 -2px 12px rgba(0,0,0,0.4)',
  }

  if (showAndroid) {
    return (
      <div style={bannerStyle} role="banner">
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
            Установить приложение
          </div>
          <div style={{ fontSize: '12px', color: '#c7d2fe' }}>
            Добавьте FamilyCoins на главный экран
          </div>
        </div>
        <button
          onClick={handleAndroidInstall}
          style={{
            backgroundColor: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Добавить
        </button>
        <button
          onClick={handleAndroidDismiss}
          aria-label="Закрыть"
          style={{
            background: 'none',
            border: 'none',
            color: '#a5b4fc',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    )
  }

  if (showIOS) {
    return (
      <div style={bannerStyle} role="banner">
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            Установить на iPhone
          </div>
          <div style={{ fontSize: '12px', color: '#c7d2fe', lineHeight: 1.5 }}>
            Нажмите{' '}
            <span
              style={{
                display: 'inline-block',
                border: '1px solid #a5b4fc',
                borderRadius: '4px',
                padding: '0 4px',
                fontSize: '13px',
              }}
            >
              ⎙
            </span>{' '}
            → «На экран "Домой"» для установки и получения уведомлений
          </div>
        </div>
        <button
          onClick={handleIOSDismiss}
          aria-label="Закрыть"
          style={{
            background: 'none',
            border: 'none',
            color: '#a5b4fc',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    )
  }

  return null
}
