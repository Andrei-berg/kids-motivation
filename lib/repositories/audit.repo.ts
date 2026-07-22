// lib/repositories/audit.repo.ts
// Supabase queries for parent audit events (phase 4.4 — security & compliance).
// insertAuditEvent is intentionally non-blocking: it logs errors but never throws,
// so audit failures never interrupt the parent action being audited.

import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

export interface AuditEvent {
  id: string
  family_id: string
  child_id: string | null
  action_type:
    | 'shop_approve'
    | 'shop_reject'
    | 'coin_adjust'
    | 'badge_award'
    | 'settings_change'
    | 'data_export'
    | 'account_delete_request'
    | 'withdraw_approve'
    | 'withdraw_reject'
    | 'behavior_approve'
    | 'behavior_reject'
  description: string
  coins_delta: number | null
  actor_user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type InsertAuditEventParams = Omit<AuditEvent, 'id' | 'created_at'>

// ============================================================================
// WRITE
// ============================================================================

/**
 * Insert a single audit event.
 * Non-blocking: catches and logs errors instead of throwing so callers are never
 * disrupted by an audit write failure.
 */
export async function insertAuditEvent(params: InsertAuditEventParams): Promise<void> {
  const { error } = await supabase.from('parent_audit_events').insert(params)
  if (error) {
    // Intentionally non-throwing — audit failure must not break the parent action
    console.error('[audit] insertAuditEvent failed', error)
  }
}

// ============================================================================
// READ
// ============================================================================

/**
 * Fetch audit events for a family, ordered newest first.
 * Optionally filter by child, paginate with limit/offset.
 */
export async function getAuditEvents(
  familyId: string,
  opts: { childId?: string; limit?: number; offset?: number } = {}
): Promise<AuditEvent[]> {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  let q = supabase
    .from('parent_audit_events')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (opts.childId) q = q.eq('child_id', opts.childId)
  if (offset > 0) q = q.range(offset, offset + limit - 1)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as AuditEvent[]
}
