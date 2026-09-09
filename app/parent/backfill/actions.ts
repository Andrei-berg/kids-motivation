'use server'

// app/parent/backfill/actions.ts
// Parent decisions on the "kid fills a past day" flow. Service-role + requireParent.
// Mirrors app/parent/behavior/actions.ts — status transitions only, NO coin
// mutation. Coins for a reviewed day are credited by the caller POSTing
// /api/wallet/award afterwards (parent caller → ungated), exactly like
// BehaviorApprovalQueue.
//
// Two gates:
//   decideBackfillRequest  requested → approved | rejected   (kid may now fill)
//   reviewBackfillDay      submitted → done | rejected        (coins on 'done')

import { createAdminClient, requireParent, AuthError } from '@/lib/supabase/admin'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import type { DayFillRequest } from '@/lib/models/child.types'

async function loadRequest(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  familyId: string,
): Promise<DayFillRequest> {
  const { data, error } = await admin
    .from('day_fill_requests')
    .select('*')
    .eq('id', id)
    .eq('family_id', familyId)
    .maybeSingle()
  if (error || !data) throw new AuthError('Request not found', 404)
  return data as DayFillRequest
}

export async function decideBackfillRequest(
  id: string,
  decision: 'approve' | 'reject',
): Promise<DayFillRequest> {
  const member = await requireParent()
  const admin = createAdminClient()
  const req = await loadRequest(admin, id, member.familyId)
  if (req.status !== 'requested') {
    throw new AuthError('This request is no longer pending', 409)
  }

  const { data, error } = await admin
    .from('day_fill_requests')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      decided_by: member.userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      req.child_id,
      decision === 'approve' ? 'Можно заполнить день ✅' : 'Запрос отклонён',
      decision === 'approve'
        ? `Родитель разрешил заполнить ${req.date}`
        : `Заполнение ${req.date} отклонено`,
      '/kid/day',
    )
  } catch (e) {
    console.warn('[decideBackfillRequest] push failed:', e)
  }

  void insertAuditEvent(
    {
      family_id: member.familyId,
      child_id: req.child_id,
      action_type: 'settings_change',
      description: `Запрос на заполнение ${req.date}: ${decision === 'approve' ? 'одобрен' : 'отклонён'}`,
      coins_delta: null,
      actor_user_id: member.userId,
      metadata: { kind: 'backfill_decide', date: req.date, decision },
    },
    admin,
  )

  return data as DayFillRequest
}

export async function reviewBackfillDay(
  id: string,
  decision: 'approve' | 'reject',
): Promise<DayFillRequest> {
  const member = await requireParent()
  const admin = createAdminClient()
  const req = await loadRequest(admin, id, member.familyId)
  if (req.status !== 'submitted') {
    throw new AuthError('This day is not awaiting review', 409)
  }

  const { data, error } = await admin
    .from('day_fill_requests')
    .update({
      status: decision === 'approve' ? 'done' : 'rejected',
      reviewed_by: member.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      req.child_id,
      decision === 'approve' ? 'День засчитан 🪙' : 'День не засчитан',
      decision === 'approve'
        ? `${req.date} проверен — монеты начислены`
        : `${req.date} отклонён при проверке`,
      '/kid/day',
    )
  } catch (e) {
    console.warn('[reviewBackfillDay] push failed:', e)
  }

  void insertAuditEvent(
    {
      family_id: member.familyId,
      child_id: req.child_id,
      action_type: 'settings_change',
      description: `Проверка заполненного дня ${req.date}: ${decision === 'approve' ? 'засчитан' : 'отклонён'}`,
      coins_delta: null,
      actor_user_id: member.userId,
      metadata: { kind: 'backfill_review', date: req.date, decision },
    },
    admin,
  )

  return data as DayFillRequest
}
