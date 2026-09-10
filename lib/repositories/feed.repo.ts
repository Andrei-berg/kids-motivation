// lib/repositories/feed.repo.ts
// Client (RLS-bound) reads/writes for the Family Feed. Event rows themselves are
// written server-side (lib/services/feed.service.ts) except free-text notes,
// which a parent posts through app/actions/post-feed-note.ts. Reactions and
// comments are family-member-writable directly, mirroring chat_reactions.

import { supabase } from '@/lib/supabase'
import type { FeedEvent, FeedReaction, FeedComment, FeedReactionSummary } from '@/lib/models/feed.types'

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
  return (data ?? []) as FeedComment[]
}

export async function getCommentCounts(familyId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('family_event_comments')
    .select('event_id')
    .eq('family_id', familyId)
  if (error) {
    console.error('[feed.repo] getCommentCounts error:', error)
    return {}
  }
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { event_id: string }[]) {
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
