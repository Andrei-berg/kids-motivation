// Sentry Node.js (server) runtime initialisation.
// Imported from instrumentation.ts register() when NEXT_RUNTIME === 'nodejs'.
// Guarded on DSN presence: with no SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN set (dev/CI), init is
// skipped entirely and the app runs as if Sentry were never installed.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Modest trace sampling — free tier, minimal setup per phase decision.
    tracesSampleRate: 0.1,
    // Never attach request/user PII automatically (headers, cookies, IP, request bodies).
    sendDefaultPii: false,
  })
}
