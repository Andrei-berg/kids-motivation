'use server'

// app/kid/day/actions.ts
// Child-initiated action: request permission to fill a PAST day.
// Service-role + requireFamilyMember (must be the child themselves). Mirrors the
// propose side of app/parent/behavior/actions.ts. The parent decides on it via
// app/parent/backfill/actions.ts; /api/wallet/award holds coins until 'done'.

import { createAdminClient, requireFamilyMember, AuthError } from '@/lib/supabase/admin'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import { localDateString, isValidCalendarDate } from '@/utils/helpers'
import type { DayFillRequest } from '@/lib/models/child.types'

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000)
}

export async function requestBackfillDay(
  childId: string,
  date: string,
): Promise<DayFillRequest> {
  if (!childId || !isValidCalendarDate(date)) {
    throw new AuthError('childId and a valid date are required', 400)
  }

  const member = await requireFamilyMember()
  if (member.role !== 'child' || member.childId !== childId) {
    throw new AuthError('Only the child can request their own past day', 403)
  }

  const admin = createAdminClient()

  const { data: child, error: childErr } = await admin
    .from('children')
    .select('id, family_id, backfill_mode, backfill_days')
    .eq('id', childId)
    .maybeSingle()
  if (childErr || !child) throw new AuthError('Child not found', 404)
  if (child.family_id !== member.familyId) throw new AuthError('Wrong family', 403)

  if (child.backfill_mode !== 'request') {
    throw new AuthError('Back-fill requests are not enabled for this child', 400)
  }

  const today = localDateString()
  const back = daysBetween(today, date)
  if (back <= 0) throw new AuthError('That day is not in the past', 400)
  if (back > (child.backfill_days ?? 0)) {
    throw new AuthError('That day is outside the allowed window', 400)
  }

  // One row per (child, date). Re-requesting a previously rejected day resets it.
  const { data, error } = await admin
    .from('day_fill_requests')
    .upsert(
      {
        family_id: member.familyId,
        child_id: childId,
        date,
        status: 'requested',
        requested_at: new Date().toISOString(),
        decided_by: null,
        decided_at: null,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
      },
      { onConflict: 'child_id,date' },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)

  try {
    const { notifyParent } = await import('@/app/actions/push-notifications')
    await notifyParent(
      member.familyId,
      'Запрос на заполнение дня 📅',
      `Ребёнок просит заполнить ${date}`,
      '/parent-center',
    )
  } catch (e) {
    console.warn('[requestBackfillDay] push failed:', e)
  }

  void insertAuditEvent(
    {
      family_id: member.familyId,
      child_id: childId,
      action_type: 'settings_change',
      description: `Ребёнок запросил заполнение дня ${date}`,
      coins_delta: null,
      actor_user_id: member.userId,
      metadata: { kind: 'backfill_request', date },
    },
    admin,
  )

  return data as DayFillRequest
}
