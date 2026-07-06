'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initAnalytics, trackPageview } from '@/lib/analytics'

// Captures a pageview on every client-side route change. Next.js App Router
// navigations don't trigger a full page load, so PostHog's own history-based
// autocapture never fires — this manual capture is the current recommended
// recipe. useSearchParams() opts this subtree out of static rendering, hence
// the Suspense boundary (mirrors the official PostHog Next.js App Router docs).
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return

    let url = window.origin + pathname
    const search = searchParams?.toString()
    if (search) {
      url = `${url}?${search}`
    }
    trackPageview(url)
  }, [pathname, searchParams])

  return null
}

/**
 * Null-UI sibling mounted once in the root layout. Initialises analytics on
 * mount and captures pageviews on every route change. No-ops entirely when
 * NEXT_PUBLIC_POSTHOG_KEY is unset (see lib/analytics.ts).
 */
export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}
