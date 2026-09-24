import { NextResponse } from 'next/server'
import { AuthError, createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { loadFamilyStats } from '@/lib/stats/family-stats'

export const dynamic = 'force-dynamic'

// Parent Center analytics. Parents see the whole family; a child sees only themselves.
export async function GET(req: Request) {
  try {
    const m = await requireFamilyMember()
    const range = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get('range'))) ? Number(new URL(req.url).searchParams.get('range')) : 7
    const stats = await loadFamilyStats(createAdminClient(), m.familyId, range)
    if (m.role === 'child') stats.children = stats.children.filter(c => c.childId === m.childId)
    return NextResponse.json(stats)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'stats_failed' }, { status: 500 })
  }
}
