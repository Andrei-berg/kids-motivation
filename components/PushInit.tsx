// components/PushInit.tsx
// Rendered in app/layout.tsx. Registers /sw.js on mount.
// No UI — purely side-effect component.
// Graceful: silently no-ops if serviceWorker or PushManager not supported.
'use client'

import { useEffect } from 'react'

export function PushInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (!('PushManager' in window)) return

    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      .catch((err) => {
        // Non-fatal: push won't work but app still functions
        console.warn('Service worker registration failed:', err)
      })
  }, [])

  return null
}
