'use client'

import { useState } from 'react'
import type { ChatMessage, ChatReaction, ReactionSummary } from '@/lib/models/chat.types'
import { upsertReaction, deleteReaction } from '@/lib/repositories/chat.repo'

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '🏆']

interface MessageReactionsProps {
  message: ChatMessage
  reactions: ChatReaction[]
  currentMemberId: string
  familyId: string
}

// Legacy standalone variant (self-persisting, no optimistic update). Kept for
// back-compat; new call sites use <ReactionPickerBar> with an onToggle handler
// so the parent owns the optimistic state.
export default function MessageReactions({
  message,
  reactions,
  currentMemberId,
  familyId,
}: MessageReactionsProps) {
  const summaries: ReactionSummary[] = REACTION_EMOJIS.map((emoji) => {
    const forEmoji = reactions.filter((r) => r.emoji === emoji)
    return {
      emoji,
      count: forEmoji.length,
      myReaction: forEmoji.some((r) => r.member_id === currentMemberId),
    }
  })

  async function handleReaction(summary: ReactionSummary) {
    if (summary.myReaction) {
      await deleteReaction({ messageId: message.id, memberId: currentMemberId, emoji: summary.emoji })
    } else {
      await upsertReaction({ messageId: message.id, familyId, memberId: currentMemberId, emoji: summary.emoji })
    }
  }

  const hasAnyReactions = summaries.some((s) => s.count > 0)
  if (!hasAnyReactions) return null

  return (
    <div className="flex gap-1 mt-1 px-1 flex-wrap">
      {summaries.map((summary) =>
        summary.count === 0 ? null : (
          <button
            key={summary.emoji}
            onClick={() => handleReaction(summary)}
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all ${
              summary.myReaction
                ? 'bg-blue-100 ring-1 ring-blue-400 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{summary.emoji}</span>
            <span className="font-medium">{summary.count}</span>
          </button>
        ),
      )}
    </div>
  )
}

// ─── ReactionPickerBar ──────────────────────────────────────────────────────
// Presentational. The parent (ChatThread / ChatPanel) owns the reactions state
// and does the optimistic update + persistence in `onToggle` — this component
// only renders the current summary and reports clicks. `mine` is the state
// BEFORE the click, so onToggle knows whether to add or remove.
//
// Quiet by default: a message with no reactions shows only a small, faint "+"
// trigger; clicking it opens the four-emoji row. A message that already has
// reactions shows its pills plus the same trigger at the end.

interface ReactionPickerBarProps {
  reactions: ChatReaction[]
  currentMemberId: string
  onToggle: (emoji: string, mine: boolean) => void
  theme?: 'light' | 'dark'
}

export function ReactionPickerBar({
  reactions,
  currentMemberId,
  onToggle,
  theme = 'light',
}: ReactionPickerBarProps) {
  const [open, setOpen] = useState(false)

  const summaries: ReactionSummary[] = REACTION_EMOJIS.map((emoji) => {
    const forEmoji = reactions.filter((r) => r.emoji === emoji)
    return {
      emoji,
      count: forEmoji.length,
      myReaction: forEmoji.some((r) => r.member_id === currentMemberId),
    }
  })
  const active = summaries.filter((s) => s.count > 0)

  const dark = theme === 'dark'
  const idle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(36,30,56,0.06)'
  const idleText = dark ? 'rgba(255,255,255,0.6)' : 'rgba(36,30,56,0.55)'
  const mineBg = dark ? 'rgba(139,123,245,0.22)' : 'rgba(91,75,212,0.12)'
  const mineBorder = dark ? 'rgba(139,123,245,0.5)' : 'rgba(91,75,212,0.5)'
  const mineText = dark ? '#C9C3DE' : '#4335A8'

  const pill = (s: ReactionSummary) => (
    <button
      key={s.emoji}
      type="button"
      onClick={() => { onToggle(s.emoji, s.myReaction); setOpen(false) }}
      aria-pressed={s.myReaction}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        height: 22, padding: '0 8px', borderRadius: 999, cursor: 'pointer',
        lineHeight: 1, fontSize: 12, fontWeight: 600,
        background: s.myReaction ? mineBg : idle,
        border: `1px solid ${s.myReaction ? mineBorder : 'transparent'}`,
        color: s.myReaction ? mineText : idleText,
        transition: 'background .12s, border-color .12s',
      }}
    >
      <span>{s.emoji}</span>
      {s.count > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {active.map(pill)}

      {open ? (
        summaries.filter((s) => s.count === 0).map(pill)
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Добавить реакцию"
          style={{
            width: 22, height: 22, borderRadius: 999, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: `1px solid ${idle}`,
            color: idleText, fontSize: 13, lineHeight: 1, padding: 0,
            opacity: active.length > 0 ? 0.9 : 0.45,
          }}
        >
          ﹢
        </button>
      )}
    </div>
  )
}
