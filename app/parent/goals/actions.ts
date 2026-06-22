'use server'

// Parent-set goal completion. When a parent marks a challenge «выполнено», the
// reward is granted: bonus coins are credited server-side (money tables are RLS
// read-only), or a named prize is simply marked won (fulfilled in real life). A
// completed goal also counts toward the goal badges. No penalty if the deadline
// passes — the parent just doesn't mark it done.

import { createAdminClient, requireParent } from '@/lib/supabase/admin'
import { creditAwards } from '@/app/api/wallet/_lib'
import { checkGoalBadges } from '@/lib/services/badges.service'

export async function completeParentGoalAction(goalId: string): Promise<{
  creditedCoins: number
  rewardType: 'coins' | 'prize' | null
  rewardText: string | null
  title: string
}> {
  const member = await requireParent()
  const admin = createAdminClient()

  const { data: goal } = await admin
    .from('goals')
    .select('id, child_id, title, kind, completed, reward_type, reward_coins, reward_text, family_id')
    .eq('id', goalId)
    .eq('family_id', member.familyId)
    .maybeSingle()
  if (!goal || goal.kind !== 'parent') throw new Error('Goal not found')
  if (goal.completed) throw new Error('Already completed')

  await admin
    .from('goals')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', goalId)

  let creditedCoins = 0
  if (goal.reward_type === 'coins' && (goal.reward_coins ?? 0) > 0) {
    // Idempotent per (child, 'parent_goal', goalId) — safe if pressed twice.
    const res = await creditAwards(admin, goal.child_id, [{
      coins: goal.reward_coins as number,
      description: `Цель: ${goal.title}`,
      icon: '🎯',
      sourceType: 'parent_goal',
      sourceId: goal.id,
    }])
    creditedCoins = res.creditedCoins
  }

  try { await checkGoalBadges(goal.child_id) } catch (e) { console.warn('[completeParentGoal] badges failed:', e) }

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    const body = goal.reward_type === 'coins' ? `+${creditedCoins} 🪙` : (goal.reward_text || 'Награда ждёт!')
    await notifyChild(goal.child_id, `Цель выполнена! ${goal.title}`, body, '/kid/wallet')
  } catch (e) {
    console.warn('[completeParentGoal] push failed:', e)
  }

  return {
    creditedCoins,
    rewardType: goal.reward_type as 'coins' | 'prize' | null,
    rewardText: goal.reward_text ?? null,
    title: goal.title,
  }
}
