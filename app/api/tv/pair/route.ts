import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sha256, newSecret, newCode, CODE_TTL_MS, deviceFromSecret } from '../_lib'

// Public (exempt in middleware): the TV is unauthenticated by definition.

// TV starts pairing → a fresh code + a secret it keeps in localStorage.
export async function POST() {
  const admin = createAdminClient()
  const secret = newSecret()
  for (let i = 0; i < 5; i++) {
    const code = newCode()
    const { error } = await admin.from('tv_devices').insert({
      secret_hash: sha256(secret), pair_code: code,
      code_expires: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    if (!error) return NextResponse.json({ code, secret, expiresInSec: CODE_TTL_MS / 1000 })
    if (!/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: 'pair_failed' }, { status: 500 })
  }
  return NextResponse.json({ error: 'pair_failed' }, { status: 500 })
}

// TV polls until a parent has claimed the code.
export async function GET(req: Request) {
  const r = await deviceFromSecret(req.headers.get('x-tv-secret'))
  if (!r?.device) return NextResponse.json({ status: 'unknown' }, { status: 404 })
  return NextResponse.json({ status: r.device.status })
}
