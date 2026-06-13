// lib/cron-auth.ts
// Unconditional auth guard for cron / push endpoints.
//
// Previously each route did `if (cronSecret) { check }` — meaning that if the
// CRON_SECRET env var was ever absent (e.g. forgotten in a new environment),
// the route became completely open. This guard fails CLOSED instead: a missing
// secret is treated as a misconfiguration and the request is rejected.

import { type NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Returns a NextResponse to short-circuit with when the caller is not an
 * authorized cron invocation, or null when the request is authorized.
 *
 *   const denied = assertCronAuth(request)
 *   if (denied) return denied
 */
export function assertCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // Fail closed — never serve these endpoints without a configured secret.
    console.error('CRON_SECRET is not configured — rejecting request')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization') ?? ''
  if (!safeEqual(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
