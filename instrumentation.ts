// Next.js instrumentation hook (requires experimental.instrumentationHook in next.config.js
// on Next.js 14). register() runs once per server runtime (nodejs / edge) before any other
// server code, so it is the correct place to load Sentry's server/edge configs.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
