// lib/services/feed.service.ts
// Server-only: write Family Feed events with the service-role client. Like
// insertAuditEvent, emitFeedEvent NEVER throws — a feed write failing must not
// break the money mutation it rides alongside.
//
// NEVER import this file in a 'use client' component.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeedEventKind } from '@/lib/models/feed.types'

export interface EmitFeedEventParams {
  familyId: string
  kind: FeedEventKind
  title: string
  refType: string
  refId?: string | null
  childId?: string | null
  actorMemberId?: string | null
  body?: string | null
  amount?: number | null
  icon?: string | null
  metadata?: Record<string, unknown>
  /**
   * 'once' — dedup on (family_id, kind, ref_type, ref_id); a repeat is ignored.
   * 'bump' — a repeat refreshes title/body/amount/created_at so the event moves
   *          back to the top (e.g. a day re-saved with more grades).
   */
  mode?: 'once' | 'bump'
}

export async function emitFeedEvent(
  params: EmitFeedEventParams,
  admin: SupabaseClient,
): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      family_id: params.familyId,
      child_id: params.childId ?? null,
      actor_member_id: params.actorMemberId ?? null,
      kind: params.kind,
      title: params.title,
      body: params.body ?? null,
      amount: params.amount ?? null,
      icon: params.icon ?? null,
      ref_type: params.refType,
      ref_id: params.refId ?? null,
      metadata: params.metadata ?? {},
    }

    // No ref_id → nothing to dedup on, plain insert.
    if (!params.refId) {
      const { error } = await admin.from('family_events').insert(row)
      if (error) console.error('[feed.service] emitFeedEvent insert failed', error)
      return
    }

    if ((params.mode ?? 'once') === 'bump') {
      row.created_at = new Date().toISOString()
    }

    const { error } = await admin
      .from('family_events')
      .upsert([row], {
        onConflict: 'family_id,kind,ref_type,ref_id',
        ignoreDuplicates: (params.mode ?? 'once') === 'once',
      })
    if (error) console.error('[feed.service] emitFeedEvent upsert failed', error)
  } catch (e) {
    console.error('[feed.service] emitFeedEvent threw', e)
  }
}
