// lib/repositories/feed.repo.ts
// Client (RLS-bound) reads/writes for the Family Feed. Event rows themselves are
// written server-side (lib/services/feed.service.ts) except free-text notes,
// which a parent posts through app/actions/post-feed-note.ts. Reactions and
// comments are family-member-writable directly, mirroring chat_reactions.

import { supabase } from '@/lib/supabase'
import type { FeedEvent, FeedReaction, FeedComment, FeedReactionSummary } from '@/lib/models/feed.types'
import { isKnownTeasePhrase } from '@/lib/kid/tease-phrases'

const PAGE = 30

export async function getFeed(
  familyId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<FeedEvent[]> {
  let q = supabase
    .from('family_events')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? PAGE)

  if (opts.before) q = q.lt('created_at', opts.before)

  const { data, error } = await q
  if (error) {
    console.error('[feed.repo] getFeed error:', error)
    return []
  }
  return (data ?? []) as FeedEvent[]
}

export async function getReactionsByFamily(familyId: string): Promise<Record<string, FeedReaction[]>> {
  const { data, error } = await supabase
    .from('family_event_reactions')
    .select('*')
    .eq('family_id', familyId)

  if (error) {
    console.error('[feed.repo] getReactionsByFamily error:', error)
    return {}
  }
  const grouped: Record<string, FeedReaction[]> = {}
  for (const r of (data ?? []) as FeedReaction[]) {
    ;(grouped[r.event_id] ||= []).push(r)
  }
  return grouped
}

export function summarizeReactions(rows: FeedReaction[] | undefined, myMemberId: string | null): FeedReactionSummary[] {
  if (!rows || rows.length === 0) return []
  const byEmoji = new Map<string, FeedReactionSummary>()
  for (const r of rows) {
    const s = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false }
    s.count += 1
    if (myMemberId && r.member_id === myMemberId) s.mine = true
    byEmoji.set(r.emoji, s)
  }
  return Array.from(byEmoji.values()).sort((a, b) => b.count - a.count)
}

export async function addReaction(params: { eventId: string; familyId: string; memberId: string; emoji: string }): Promise<void> {
  const { error } = await supabase
    .from('family_event_reactions')
    .upsert(
      [{ event_id: params.eventId, family_id: params.familyId, member_id: params.memberId, emoji: params.emoji }],
      { onConflict: 'event_id,member_id,emoji', ignoreDuplicates: true },
    )
  if (error) console.error('[feed.repo] addReaction error:', error)
}

export async function removeReaction(params: { eventId: string; memberId: string; emoji: string }): Promise<void> {
  const { error } = await supabase
    .from('family_event_reactions')
    .delete()
    .eq('event_id', params.eventId)
    .eq('member_id', params.memberId)
    .eq('emoji', params.emoji)
  if (error) console.error('[feed.repo] removeReaction error:', error)
}

export async function getComments(eventId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('family_event_comments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[feed.repo] getComments error:', error)
    return []
  }
  return (data ?? []).filter(c => !isTeaseComment(c as FeedComment)) as FeedComment[]
}

export async function getCommentCounts(familyId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('family_event_comments')
    .select('event_id, body')
    .eq('family_id', familyId)
  if (error) {
    console.error('[feed.repo] getCommentCounts error:', error)
    return {}
  }
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { event_id: string; body: string }[]) {
    if (row.body.startsWith(TEASE_PREFIX) && isKnownTeasePhrase(row.body.slice(TEASE_PREFIX.length))) continue
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  }
  return counts
}

export async function addComment(params: {
  eventId: string
  familyId: string
  authorMemberId: string
  authorName: string
  body: string
}): Promise<FeedComment | null> {
  const { data, error } = await supabase
    .from('family_event_comments')
    .insert({
      event_id: params.eventId,
      family_id: params.familyId,
      author_member_id: params.authorMemberId,
      author_name: params.authorName,
      body: params.body,
    })
    .select()
    .single()
  if (error) {
    console.error('[feed.repo] addComment error:', error)
    return null
  }
  return data as FeedComment
}

// ─── Tease ("Подколоть") — FEED-06, D-06/D-07 ──────────────────────────────
// `family_event_comments` has no `metadata` column, so a tease is an ordinary
// comment row tagged with a reserved body prefix — a storage convention
// stripped at render time, never shown to a user. No migration, no new RLS
// policy, no new realtime subscription.

export const TEASE_PREFIX = '[[tease]] '

// True only when the prefix is present AND the remaining text is one of the
// locked tease phrases (lib/kid/tease-phrases.ts). Both conditions are
// required: the phrase-set check is what stops a kid from hand-typing
// `[[tease]] anything` into the ordinary comment box and having it render as
// a grape tease bubble.
export function isTeaseComment(c: FeedComment): boolean {
  return c.body.startsWith(TEASE_PREFIX) && isKnownTeasePhrase(c.body.slice(TEASE_PREFIX.length))
}

export function teaseTextOf(c: FeedComment): string {
  return isTeaseComment(c) ? c.body.slice(TEASE_PREFIX.length) : c.body
}

// Writes a tease as a tagged `family_event_comments` row. Returns `null`
// immediately for any phrase outside the locked set — never writes
// unvalidated text through this path. Delegates to `addComment` so the
// RLS-bound browser client and the error logging stay a single code path.
export async function addTeaseReply(params: {
  eventId: string
  familyId: string
  authorMemberId: string
  authorName: string
  phrase: string
}): Promise<FeedComment | null> {
  if (!isKnownTeasePhrase(params.phrase)) return null
  return addComment({
    eventId: params.eventId,
    familyId: params.familyId,
    authorMemberId: params.authorMemberId,
    authorName: params.authorName,
    body: TEASE_PREFIX + params.phrase,
  })
}

// Mirrors getReactionsByFamily's shape: all tease rows for a family, grouped
// by event_id, oldest first. Rows with the prefix but an unrecognized phrase
// (forged/stale) are skipped rather than surfaced as a tease.
export async function getTeaseRepliesByFamily(familyId: string): Promise<Record<string, FeedComment[]>> {
  const { data, error } = await supabase
    .from('family_event_comments')
    .select('*')
    .eq('family_id', familyId)
    .like('body', `${TEASE_PREFIX}%`)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[feed.repo] getTeaseRepliesByFamily error:', error)
    return {}
  }
  const grouped: Record<string, FeedComment[]> = {}
  for (const c of (data ?? []) as FeedComment[]) {
    if (!isTeaseComment(c)) continue
    ;(grouped[c.event_id] ||= []).push(c)
  }
  return grouped
}

// D-07 one-tease-per-(person, card) check. Pure, no I/O — runs off the
// already-loaded map, so it costs no extra query (same discipline as
// summarizeReactions).
export function hasTeased(rows: FeedComment[] | undefined, myMemberId: string | null): boolean {
  return !!myMemberId && !!rows && rows.some(r => r.author_member_id === myMemberId)
}

// ─── Unread marker ───────────────────────────────────────────────────────────
// The feed's "unread" nudge is a per-device convenience (one kid, one device),
// so the last-seen timestamp lives in localStorage rather than on
// family_members like chat_last_read_at. Every access is guarded.

function feedSeenKey(familyId: string) {
  return `feed_seen_${familyId}`
}

export function getFeedSeen(familyId: string): string | null {
  try {
    return window.localStorage.getItem(feedSeenKey(familyId))
  } catch {
    return null
  }
}

export function markFeedSeen(familyId: string, atIso?: string): void {
  try {
    window.localStorage.setItem(feedSeenKey(familyId), atIso ?? new Date().toISOString())
  } catch {
    /* private mode / disabled storage — the badge just won't clear, no crash */
  }
}

// ─── Story bubble seen/unseen marker (D-06) ─────────────────────────────────
// Per-viewer, per-child, per-day, view-local only — never written to the DB.
// Uses a key prefix deliberately distinct from the whole-feed marker above so
// the two key namespaces can never collide. `dateStr` is always supplied by
// the caller (plan 09.1-03 passes the family-local "today" string) — this
// repo does not compute dates itself, so the date source stays a single
// decision point outside this file.

function storySeenKey(familyId: string, childId: string, dateStr: string) {
  return `story_seen_${familyId}_${childId}_${dateStr}`
}

export function getStorySeen(familyId: string, childId: string, dateStr: string): boolean {
  try {
    return window.localStorage.getItem(storySeenKey(familyId, childId, dateStr)) !== null
  } catch {
    return false
  }
}

export function markStorySeen(familyId: string, childId: string, dateStr: string): void {
  try {
    window.localStorage.setItem(storySeenKey(familyId, childId, dateStr), new Date().toISOString())
  } catch {
    /* private mode / disabled storage — the ring just won't flatten, no crash */
  }
}

export async function getFeedUnreadCount(familyId: string, since: string | null): Promise<number> {
  let q = supabase
    .from('family_events')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId)
  if (since) q = q.gt('created_at', since)

  const { count, error } = await q
  if (error) {
    console.error('[feed.repo] getFeedUnreadCount error:', error)
    return 0
  }
  return count ?? 0
}

// Realtime: any INSERT into the three feed tables for this family.
export function subscribeFeed(
  familyId: string,
  handlers: {
    onEvent?: (e: FeedEvent) => void
    onReaction?: (r: FeedReaction) => void
    onComment?: (c: FeedComment) => void
  },
): () => void {
  const channel = supabase
    .channel(`family-feed-${familyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'family_events', filter: `family_id=eq.${familyId}` },
      (p) => { if (p.eventType === 'INSERT') handlers.onEvent?.(p.new as FeedEvent) })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_event_reactions', filter: `family_id=eq.${familyId}` },
      (p) => handlers.onReaction?.(p.new as FeedReaction))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_event_comments', filter: `family_id=eq.${familyId}` },
      (p) => handlers.onComment?.(p.new as FeedComment))
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
