'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAndAwardBadges } from '@/lib/services/badges.service'
import { updateStreaks } from '@/lib/services/streaks.service'
import { localDateString } from '@/utils/helpers'

export interface RepairResult {
  childId: string
  name: string
  badgesAwarded: string[]
  xpBefore: number
  xpAfter: number
  error?: string
}

/**
 * Retroactively checks and awards all badges that should have been earned
 * based on current historical data. Safe to run multiple times — checks
 * prevent duplicate awards.
 */
export async function repairAchievements(): Promise<RepairResult[]> {
  const supabase = await createClient()
  const { data: children, error } = await supabase
    .from('children')
    .select('id, name, xp')
    .eq('active', true)

  if (error || !children) throw new Error('Failed to load children')

  const today = localDateString()
  const results: RepairResult[] = []
  const admin = createAdminClient()

  for (const child of children) {
    try {
      // Re-run streak update so counts are fresh before badge checks
      await updateStreaks(admin, child.id, today)

      const awarded = await checkAndAwardBadges(child.id, today)

      // Fetch updated XP
      const { data: updated } = await supabase
        .from('children')
        .select('xp')
        .eq('id', child.id)
        .single()

      results.push({
        childId: child.id,
        name: child.name,
        badgesAwarded: awarded,
        xpBefore: child.xp,
        xpAfter: updated?.xp ?? child.xp,
      })
    } catch (e) {
      results.push({
        childId: child.id,
        name: child.name,
        badgesAwarded: [],
        xpBefore: child.xp,
        xpAfter: child.xp,
        error: String(e),
      })
    }
  }

  return results
}
