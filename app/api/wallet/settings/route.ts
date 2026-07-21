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

// grade_coin_map (JSONB, phase 5.9 D-06/D-08) is a new shape-injection surface
// on the ...safe spread below — it has no per-field validation otherwise.
// Defense-in-depth, same idiom as clampStreakFields: reject the whole map on
// any invalid value rather than storing a partially-garbage shape. The award
// route's `grade_coin_map[grade] ?? 0` lookup is the authoritative backstop
// regardless (T-059-02), but validating here keeps the Settings UI from ever
// rendering NaN/absurd numbers back to the parent.
function clampGradeCoinMap(safe: Record<string, unknown>): void {
  if (!('grade_coin_map' in safe)) return
  const map = safe.grade_coin_map
  if (typeof map !== 'object' || map === null || Array.isArray(map)) {
    delete safe.grade_coin_map
    return
  }
  const entries = Object.entries(map as Record<string, unknown>)
  const clamped: Record<string, number> = {}
  for (const [key, rawValue] of entries) {
    const n = Number(rawValue)
    if (!Number.isFinite(n)) {
      // Reject the entire map rather than storing a partial/garbage shape.
      delete safe.grade_coin_map
      return
    }
    clamped[key] = Math.min(100000, Math.max(-100000, Math.floor(n)))
  }
  safe.grade_coin_map = clamped
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
    clampGradeCoinMap(safe)

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
