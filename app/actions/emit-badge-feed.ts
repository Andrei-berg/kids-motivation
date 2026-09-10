'use server'

// Badge checks (checkAndAwardBadges) run client-side, so their Family Feed
// events can't be emitted from there — clients may only insert kind='note'.
// The day-fill forms and the kid shop action call this after a badge is
// awarded; it resolves the family from the child and emits via service-role.
// Non-blocking and idempotent (refId = childId:badgeKey).

import { createAdminClient } from '@/lib/supabase/admin'
import { emitFeedEvent } from '@/lib/services/feed.service'
import { BADGES } from '@/lib/services/badges.service'

export async function emitBadgeFeedEvents(childId: string, badgeKeys: string[]): Promise<void> {
  if (!childId || !Array.isArray(badgeKeys) || badgeKeys.length === 0) return
  try {
    const admin = createAdminClient()
    const { data: child } = await admin
      .from('children')
      .select('family_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child?.family_id) return

    for (const key of badgeKeys) {
      const meta = BADGES.find(b => b.key === key)
      await emitFeedEvent({
        familyId: child.family_id,
        childId,
        kind: 'badge',
        title: `Новый значок: ${meta?.title ?? key}`,
        body: meta?.description ?? null,
        icon: meta?.icon ?? '🏅',
        refType: 'badge',
        refId: `${childId}:${key}`,
        mode: 'once',
      }, admin)
    }
  } catch (e) {
    console.error('[emitBadgeFeedEvents]', e)
  }
}
