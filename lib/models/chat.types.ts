export type MessageType = 'text' | 'sticker' | 'system'

export interface ChatMessage {
  id: string
  family_id: string
  sender_id: string        // family_members.id
  sender_name: string      // display name for rendering
  sender_role: 'parent' | 'child'
  message_type: MessageType
  content: string | null   // text or system event text
  sticker_id: string | null
  created_at: string
}

export interface ChatReaction {
  id: string
  message_id: string
  family_id: string
  member_id: string    // family_members.id
  emoji: string        // one of ❤️ 👍 🔥 🏆
  created_at: string
}

// Derived client-side type for rendering
export interface ReactionSummary {
  emoji: string
  count: number
  myReaction: boolean  // true if currentMemberId has this reaction
}
