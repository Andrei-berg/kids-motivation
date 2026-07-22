'use server'

// app/parent/behavior/actions.ts
// Server actions for the behavior-mark propose→approve→credit boundary
// (Phase 5.9 Plan 07). Analog: app/parent/shop/actions.ts, with one
// DELIBERATE divergence — approval moves NO coins. It only flips
// behavior_marks.status from 'pending' to 'approved'; the next
// /api/wallet/award POST is what actually credits the tag's price
// (idempotent, keyed on the mark's own id — see
// app/api/wallet/award/route.ts's pushBehaviorMarkIntents, plan 06). Do NOT
// port adjustCoins/applyWalletDelta/wallet_apply into this file — that would
// double-credit against the award route's own crediting.

import { createAdminClient, requireParent, assertChildInFamily } from '@/lib/supabase/admin'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import { normalizeDate } from '@/utils/helpers'
import type { BehaviorMark } from '@/lib/models/behavior.types'

/**
 * Approves a pending behavior_marks row. Parent-only (a child role throws
 * AuthError 403 — T-059-01, a child can never self-approve). Fetches the mark
 * scoped to the caller's family, asserts it is still 'pending', then flips
 * status only — no coin mutation happens here.
 */
export async function approveBehaviorMark(markId: string): Promise<BehaviorMark> {
  const member = await requireParent()
  const admin = createAdminClient()

  const { data: mark, error: fetchError } = await admin
    .from('behavior_marks')
    .select('*')
    .eq('id', markId)
    .eq('family_id', member.familyId)
    .maybeSingle()

  if (fetchError || !mark) throw new Error('Behavior mark not found')
  if (mark.status !== 'pending') throw new Error('Behavior mark is not pending')

  const { data, error } = await admin
    .from('behavior_marks')
    .update({
      status: 'approved',
      decided_by: member.userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', markId)
    .select()
    .single()

  if (error) throw error

  try {
    const { data: tag } = await admin
      .from('behavior_tags')
      .select('name, icon')
      .eq('id', mark.tag_id)
      .maybeSingle()
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      mark.child_id,
      `Тег одобрен! ${tag?.icon ?? '⭐'}`,
      `${tag?.name ?? 'Поведение'} — засчитано`,
      '/kid/day'
    )
  } catch (e) {
    console.warn('[approveBehaviorMark] push failed:', e)
  }

  void insertAuditEvent({
    family_id: mark.family_id ?? '',
    child_id: mark.child_id ?? null,
    action_type: 'behavior_approve',
    description: `Approved behavior mark (tag ${mark.tag_id})`,
    coins_delta: null,
    actor_user_id: member.userId,
    metadata: { mark_id: markId, tag_id: mark.tag_id },
  })

  return data as BehaviorMark
}

/**
 * Rejects a pending behavior_marks row. Parent-only. Nothing was credited
 * while pending, so — unlike rejectPurchaseAction — there is no refund to
 * issue; this is a simple status flip.
 */
export async function rejectBehaviorMark(markId: string, note?: string): Promise<BehaviorMark> {
  const member = await requireParent()
  const admin = createAdminClient()

  const { data: mark, error: fetchError } = await admin
    .from('behavior_marks')
    .select('*')
    .eq('id', markId)
    .eq('family_id', member.familyId)
    .maybeSingle()

  if (fetchError || !mark) throw new Error('Behavior mark not found')
  if (mark.status !== 'pending') throw new Error('Behavior mark is not pending')

  const { data, error } = await admin
    .from('behavior_marks')
    .update({
      status: 'rejected',
      decided_by: member.userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', markId)
    .select()
    .single()

  if (error) throw error

  try {
    const { data: tag } = await admin
      .from('behavior_tags')
      .select('name, icon')
      .eq('id', mark.tag_id)
      .maybeSingle()
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(
      mark.child_id,
      `Тег отклонён ${tag?.icon ?? '⭐'}`,
      `${tag?.name ?? 'Поведение'} — не засчитано`,
      '/kid/day'
    )
  } catch (e) {
    console.warn('[rejectBehaviorMark] push failed:', e)
  }

  void insertAuditEvent({
    family_id: mark.family_id ?? '',
    child_id: mark.child_id ?? null,
    action_type: 'behavior_reject',
    description: `Rejected behavior mark (tag ${mark.tag_id})${note ? `: ${note}` : ''}`,
    coins_delta: null,
    actor_user_id: member.userId,
    metadata: { mark_id: markId, tag_id: mark.tag_id, note: note ?? null },
  })

  return data as BehaviorMark
}

/**
 * The parent-direct (ungated) path — used by DailyModal for both the D-09
 * default-tag dual-write and any parent-applied custom tag. Runs service-role
 * so it legitimately bypasses the client 'pending'-only RLS WITH CHECK
 * (T-059-03) — the client path can never produce an 'approved' mark directly.
 * Not gated by any approval step (D-12): a parent's own assessment is applied
 * immediately.
 */
export async function applyTagDirect(childId: string, date: string, tagId: string): Promise<BehaviorMark> {
  const member = await requireParent()
  const admin = createAdminClient()

  await assertChildInFamily(admin, childId, member.familyId)

  const { data: tag, error: tagError } = await admin
    .from('behavior_tags')
    .select('id')
    .eq('id', tagId)
    .eq('family_id', member.familyId)
    .maybeSingle()

  if (tagError || !tag) throw new Error('Behavior tag not found')

  const { data, error } = await admin
    .from('behavior_marks')
    .insert({
      child_id: childId,
      family_id: member.familyId,
      date: normalizeDate(date),
      tag_id: tagId,
      status: 'approved',
      proposed_by: member.userId,
      decided_by: member.userId,
      decided_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as BehaviorMark
}
