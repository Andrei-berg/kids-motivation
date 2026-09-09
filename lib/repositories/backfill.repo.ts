// lib/repositories/backfill.repo.ts
// Reads for day_fill_requests (the "kid asks to fill a past day" flow).
// Day-data table under family RLS — browser client, like behavior.repo.ts.
// Every STATUS TRANSITION is a service-role server action
// (app/kid/day/actions.ts, app/parent/backfill/actions.ts) — never here.

import { supabase } from '../supabase'
import { normalizeDate } from '@/utils/helpers'
import type { DayFillRequest, BackfillRequestStatus } from '../models/child.types'

/** All requests for a family, optionally filtered by status(es). Queue view. */
export async function getBackfillRequests(
  familyId: string,
  opts: { status?: BackfillRequestStatus | BackfillRequestStatus[] } = {},
): Promise<DayFillRequest[]> {
  let q = supabase
    .from('day_fill_requests')
    .select('*')
    .eq('family_id', familyId)

  if (opts.status) {
    q = Array.isArray(opts.status) ? q.in('status', opts.status) : q.eq('status', opts.status)
  }

  const { data, error } = await q.order('requested_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DayFillRequest[]
}

/** Requests for one child within a date range (inclusive) — the kid week strip. */
export async function getChildBackfillRequestsInRange(
  childId: string,
  start: string,
  end: string,
): Promise<DayFillRequest[]> {
  const { data, error } = await supabase
    .from('day_fill_requests')
    .select('*')
    .eq('child_id', childId)
    .gte('date', normalizeDate(start))
    .lte('date', normalizeDate(end))
  if (error) throw error
  return (data ?? []) as DayFillRequest[]
}
