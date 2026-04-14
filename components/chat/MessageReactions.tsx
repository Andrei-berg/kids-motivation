'use client'

import type { ChatMessage, ChatReaction, ReactionSummary } from '@/lib/models/chat.types'
import { upsertReaction, deleteReaction } from '@/lib/repositories/chat.repo'

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '🏆']

interface MessageReactionsProps {
  message: ChatMessage
  reactions: ChatReaction[]
  currentMemberId: string
  familyId: string
}

export default function MessageReactions({
  message,
  reactions,
  currentMemberId,
  familyId,
}: MessageReactionsProps) {
  // Compute summaries per emoji
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
      await deleteReaction({
        messageId: message.id,
        memberId: currentMemberId,
        emoji: summary.emoji,
      })
    } else {
      await upsertReaction({
        messageId: message.id,
        familyId,
        memberId: currentMemberId,
        emoji: summary.emoji,
      })
    }
  }

  // Don't render if no reactions and nothing to show (still show picker affordance)
  const hasAnyReactions = summaries.some((s) => s.count > 0)
  if (!hasAnyReactions) {
    return null
  }

  return (
    <div className="flex gap-1 mt-1 px-1 flex-wrap">
      {summaries.map((summary) => {
        if (summary.count === 0) return null
        return (
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
        )
      })}
    </div>
  )
}

// Also export a reaction trigger bar (always-visible add-reaction area)
interface ReactionPickerBarProps {
  message: ChatMessage
  reactions: ChatReaction[]
  currentMemberId: string
  familyId: string
}

export function ReactionPickerBar({
  message,
  reactions,
  currentMemberId,
  familyId,
}: ReactionPickerBarProps) {
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
      await deleteReaction({
        messageId: message.id,
        memberId: currentMemberId,
        emoji: summary.emoji,
      })
    } else {
      await upsertReaction({
        messageId: message.id,
        familyId,
        memberId: currentMemberId,
        emoji: summary.emoji,
      })
    }
  }

  return (
    <div className="flex gap-1 mt-1 px-1 flex-wrap">
      {summaries.map((summary) => (
        <button
          key={summary.emoji}
          onClick={() => handleReaction(summary)}
          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all ${
            summary.myReaction
              ? 'bg-blue-100 ring-1 ring-blue-400 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>{summary.emoji}</span>
          {summary.count > 0 && <span className="font-medium">{summary.count}</span>}
        </button>
      ))}
    </div>
  )
}
