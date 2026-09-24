import { NextResponse } from 'next/server'
import { loadFamilyStats } from '@/lib/stats/family-stats'
import { deviceFromSecret } from '../_lib'

export const dynamic = 'force-dynamic'

// Read-only board data for a paired TV. 28 days covers the week strip + 4-week trend.
export async function GET(req: Request) {
  const r = await deviceFromSecret(req.headers.get('x-tv-secret'))
  if (!r?.device || r.device.status !== 'active' || !r.device.family_id) {
    return NextResponse.json({ error: 'not_paired' }, { status: 401 })
  }
  await r.admin.from('tv_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', r.device.id)
  const stats = await loadFamilyStats(r.admin, r.device.family_id, 28, { feed: 10 })
  return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } })
}
