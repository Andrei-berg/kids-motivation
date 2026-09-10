// Family Feed — a single shared stream of family activity. See
// supabase/migrations/2026-09-11-family-feed.sql.

export type FeedEventKind =
  | 'coins_earned'
  | 'coins_spent'
  | 'day_filled'
  | 'badge'
  | 'streak'
  | 'purchase'
  | 'reward_approved'
  | 'medal'
  | 'reading_approved'
  | 'level_up'
  | 'boost'
  | 'note'

export interface FeedEvent {
  id: string
  family_id: string
  child_id: string | null
  actor_member_id: string | null
  kind: FeedEventKind
  title: string
  body: string | null
  amount: number | null
  icon: string | null
  ref_type: string
  ref_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface FeedReaction {
  id: string
  event_id: string
  family_id: string
  member_id: string
  emoji: string
  created_at: string
}

export interface FeedComment {
  id: string
  event_id: string
  family_id: string
  author_member_id: string
  author_name: string
  body: string
  created_at: string
}

// Reactions rolled up for one event, ready to render.
export interface FeedReactionSummary {
  emoji: string
  count: number
  mine: boolean
}

export const FEED_REACTION_EMOJI = ['❤️', '👍', '🔥', '🏆', '😂', '🎉'] as const
