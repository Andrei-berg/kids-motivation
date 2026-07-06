// app/api/health/route.ts
// Tiny reachability probe used by the client connectivity check (lib/use-connectivity.ts).
// Lives under /api/ on purpose: the service worker (public/sw.js) passes /api/ requests
// straight to the network and never serves them from cache, so a successful response
// here means the device genuinely reached the server — unlike cached pages/icons.

import { NextResponse } from 'next/server'

// Never statically optimized or cached — always hits the server.
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Deliberate, on-demand error trigger for Sentry verification. Not caught here on
  // purpose — it must propagate so the server Sentry instrumentation captures it and
  // Next.js returns a 500. No state mutation, no amplification (T-051-08, accepted).
  if (searchParams.get('boom') === '1') {
    throw new Error('Sentry test error: /api/health?boom=1')
  }

  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
