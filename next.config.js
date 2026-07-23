const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14 requires this flag to pick up instrumentation.ts (stable by default in Next 15+).
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
  // Phase 05.11: server-level redirects for the 10 retired legacy routes —
  // replaces their in-app redirect-stub page.tsx files (now deleted).
  async redirects() {
    return [
      { source: '/dashboard', destination: '/parent-center', permanent: true },
      { source: '/wallet', destination: '/parent-center', permanent: true },
      { source: '/analytics', destination: '/parent-center', permanent: true },
      { source: '/expenses', destination: '/parent-center', permanent: true },
      { source: '/settings', destination: '/parent/settings', permanent: true },
      { source: '/streaks', destination: '/parent-center', permanent: true },
      { source: '/records', destination: '/parent-center', permanent: true },
      { source: '/audit', destination: '/parent-center', permanent: true },
      { source: '/coach-rating', destination: '/parent-center', permanent: true },
      { source: '/wallboard', destination: '/parent-center', permanent: true },
    ]
  },
}

// Sentry build options: source-map upload only fires when SENTRY_AUTH_TOKEN is present
// (unset on the free tier per phase decision) — silent avoids noisy build logs otherwise.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  widenClientFileUpload: false,
  tunnelRoute: undefined,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
