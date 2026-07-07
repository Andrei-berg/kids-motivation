// app/api/wallet/settings/route.ts
// Parent-only wallet settings update (coin rules, exchange rates, p2p limits).
// Reads stay on the client (RLS allows SELECT); writes go through here.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireParent } from '@/lib/supabase/admin'
import { errorResponse } from '../_lib'

// The six streak config fields (added in phase 05.4-01). Defense-in-depth
// against a tampered client PATCH — clamp before upsert. days -> [1, 365],
// bonus -> [0, 100000]. The award-side clamp in award/route.ts remains
// authoritative regardless of what lands in the DB.
const STREAK_DAYS_KEYS = ['streak_room_days', 'streak_study_days', 'streak_sport_days']
const STREAK_BONUS_KEYS = ['streak_room_bonus', 'streak_study_bonus', 'streak_sport_bonus']

function clampStreakFields(safe: Record<string, unknown>): void {
  for (const key of STREAK_DAYS_KEYS) {
    if (!(key in safe)) continue
    const n = Number(safe[key])
    if (Number.isNaN(n)) {
      delete safe[key]
      continue
    }
    safe[key] = Math.min(365, Math.max(1, Math.floor(n)))
  }
  for (const key of STREAK_BONUS_KEYS) {
    if (!(key in safe)) continue
    const n = Number(safe[key])
    if (Number.isNaN(n)) {
      delete safe[key]
      continue
    }
    safe[key] = Math.min(100000, Math.max(0, Math.floor(n)))
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const updates = await req.json()
    const member = await requireParent()
    const admin = createAdminClient()

    // id / family_id are derived from the authenticated parent — never trusted.
    const { id, family_id, updated_at, ...safe } = updates ?? {}
    void id; void family_id; void updated_at
    clampStreakFields(safe)

    const { data, error } = await admin
      .from('wallet_settings')
      .upsert({
        id: member.familyId,
        family_id: member.familyId,
        ...safe,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, settings: data })
  } catch (err) {
    return errorResponse(err)
  }
}
