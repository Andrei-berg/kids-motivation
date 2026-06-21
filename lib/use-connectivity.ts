'use client'

// lib/use-connectivity.ts
// Reliable online/offline detection for the app shell.
//
// Why this exists: `navigator.onLine` is only a hint — it reports whether the
// device has *a* network interface, not whether requests actually reach the
// server. On mobile (especially an installed PWA) it produces frequent false
// positives: it flips to `offline` when the app is backgrounded/resumed, the
// screen locks, or the device switches Wi-Fi↔cellular, and the matching
// `online` event is often missed, leaving a "no connection" banner stuck.
//
// Strategy: stay optimistic (online) and only declare offline after a real
// reachability probe to /api/health fails. Re-probe on the browser online/offline
// events, when the tab becomes visible again (the main resume-from-background
// false positive), and on a slow poll while offline so the app auto-recovers.

import { useEffect, useState, useRef, useCallback } from 'react'

const PROBE_URL = '/api/health'
const PROBE_TIMEOUT_MS = 5000
const RECHECK_INTERVAL_MS = 15000

/** Fetches the health endpoint; resolves true if the server was reachable. */
async function probeReachable(): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    // Any HTTP response (even non-2xx) means the network is up. A thrown error
    // or timeout means it isn't. cache:'no-store' guarantees we hit the network.
    await fetch(PROBE_URL, { method: 'GET', cache: 'no-store', signal: controller.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function useConnectivity(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false)
  // Guards against overlapping probes and against state updates after unmount.
  const probing = useRef(false)
  const mounted = useRef(true)

  const runProbe = useCallback(async () => {
    if (probing.current) return
    probing.current = true
    try {
      const reachable = await probeReachable()
      if (mounted.current) setIsOffline(!reachable)
    } finally {
      probing.current = false
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    // `offline` is only a hint — confirm with a probe before showing the banner.
    const handleOffline = () => { runProbe() }
    // `online` is trustworthy enough to clear immediately; still re-probe to be sure.
    const handleOnline = () => { setIsOffline(false); runProbe() }
    // Resume-from-background is the #1 source of stale offline state on mobile.
    const handleVisibility = () => { if (document.visibilityState === 'visible') runProbe() }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    // Confirm initial state only if the browser claims we're offline — otherwise
    // trust the optimistic default and avoid a probe on every cold load.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) runProbe()

    // Slow poll so a recovered connection clears the banner without user action.
    const interval = setInterval(() => { if (isOffline) runProbe() }, RECHECK_INTERVAL_MS)

    return () => {
      mounted.current = false
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [runProbe, isOffline])

  return { isOffline }
}
