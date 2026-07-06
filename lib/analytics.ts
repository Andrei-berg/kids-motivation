'use client'

// Vendor-swappable product analytics wrapper.
//
// Everything in this file is a clean no-op when NEXT_PUBLIC_POSTHOG_KEY is not
// set (local dev, CI, preview deploys without the key configured) — nothing is
// ever sent, and nothing ever throws. To swap vendors later, only this file
// (and AnalyticsProvider.tsx) needs to change; call sites only ever import
// `track` from here.

import posthog from 'posthog-js'

let initialized = false

/**
 * Initializes the analytics SDK. Safe to call multiple times (idempotent) and
 * safe to call on the server (no-ops when `window` is undefined). No-ops when
 * NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return
  if (initialized) return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    // We capture pageviews manually from AnalyticsProvider on route change
    // (the recommended pattern for the Next.js App Router, where PostHog's
    // own history-based autocapture cannot see client-side navigations).
    capture_pageview: false,
    // Minimal footprint on a children's app: no session replay.
    disable_session_recording: true,
  })
  initialized = true
}

/**
 * Records a custom event. No-op (never throws) when the key is absent or
 * init never ran — safe to call unconditionally from any call site.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  if (!initialized) return

  try {
    posthog.capture(event, properties)
  } catch {
    // Analytics must never break the app.
  }
}

/** Internal use by AnalyticsProvider to record pageviews on navigation. */
export function trackPageview(url: string): void {
  track('$pageview', { $current_url: url })
}
