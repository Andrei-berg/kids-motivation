import { NextResponse } from 'next/server'
import { loadFamilyStats } from '@/lib/stats/family-stats'
import { loadTvExtras } from '@/lib/stats/tv-extras'
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
  const today = stats.children[0]?.days.at(-1)?.date ?? new Date().toISOString().slice(0, 10)
  const tv = await loadTvExtras(r.admin, r.device.family_id, stats.children.map(c => c.childId), today).catch(() => null)
  return NextResponse.json({ ...stats, tv }, { headers: { 'Cache-Control': 'no-store' } })
}
