import { supabase } from '@/lib/supabase'
import type { ChatMessage, ChatReaction, MessageType } from '@/lib/models/chat.types'

export async function getMessages(familyId: string, limit = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[chat.repo] getMessages error:', error)
    return []
  }

  return data ?? []
}

export async function sendMessage(params: {
  familyId: string
  senderId: string
  senderName: string
  senderRole: 'parent' | 'child'
  messageType: MessageType
  content?: string
  stickerId?: string
  photoUrl?: string
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      family_id: params.familyId,
      sender_id: params.senderId,
      sender_name: params.senderName,
      sender_role: params.senderRole,
      message_type: params.messageType,
      content: params.content ?? null,
      sticker_id: params.stickerId ?? null,
      photo_url: params.photoUrl ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`[chat.repo] sendMessage failed: ${error.message}`)
  }

  return data as ChatMessage
}

export function subscribeToMessages(
  familyId: string,
  onMessage: (msg: ChatMessage) => void
): () => void {
  const channel = supabase
    .channel(`family-chat-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => onMessage(payload.new as ChatMessage)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getReactions(messageId: string): Promise<ChatReaction[]> {
  const { data, error } = await supabase
    .from('chat_reactions')
    .select('*')
    .eq('message_id', messageId)

  if (error) {
    console.error('[chat.repo] getReactions error:', error)
    return []
  }

  return data ?? []
}

export async function getReactionsByFamily(familyId: string): Promise<Record<string, ChatReaction[]>> {
  const { data, error } = await supabase
    .from('chat_reactions')
    .select('*')
    .eq('family_id', familyId)

  if (error) {
    console.error('[chat.repo] getReactionsByFamily error:', error)
    return {}
  }

  const grouped: Record<string, ChatReaction[]> = {}
  for (const r of data ?? []) {
    if (!grouped[r.message_id]) grouped[r.message_id] = []
    grouped[r.message_id].push(r)
  }
  return grouped
}

export async function upsertReaction(params: {
  messageId: string
  familyId: string
  memberId: string
  emoji: string
}): Promise<void> {
  const { error } = await supabase
    .from('chat_reactions')
    .upsert(
      [
        {
          message_id: params.messageId,
          family_id: params.familyId,
          member_id: params.memberId,
          emoji: params.emoji,
        },
      ],
      { onConflict: 'message_id,member_id,emoji', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[chat.repo] upsertReaction error:', error)
  }
}

export async function deleteReaction(params: {
  messageId: string
  memberId: string
  emoji: string
}): Promise<void> {
  const { error } = await supabase
    .from('chat_reactions')
    .delete()
    .eq('message_id', params.messageId)
    .eq('member_id', params.memberId)
    .eq('emoji', params.emoji)

  if (error) {
    console.error('[chat.repo] deleteReaction error:', error)
  }
}

export async function postSystemMessage(params: {
  familyId: string
  content: string
}): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      family_id: params.familyId,
      sender_id: 'system',
      sender_name: 'FamilyCoins',
      sender_role: 'parent',
      message_type: 'system',
      content: params.content,
    })
  if (error) throw error
}

// ─── Unread marker (D-04) ───────────────────────────────────────────────────
// Own-row read-state tracking on family_members.chat_last_read_at. Goes
// through the mark_chat_read() SECURITY DEFINER RPC (05.7-02), which can
// touch ONLY chat_last_read_at for auth.uid()'s own row — a direct UPDATE
// policy on family_members would expose privileged columns (role, family_id)
// to self-service PATCH (CR-01).

export async function markChatRead(_memberId?: string): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read')

  if (error) {
    console.error('[chat.repo] markChatRead error:', error)
  }
}

export async function getChatUnreadCount(
  familyId: string,
  memberId: string,
  lastReadAt: string | null
): Promise<number> {
  let query = supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .neq('sender_id', memberId)

  if (lastReadAt) {
    query = query.gt('created_at', lastReadAt)
  }

  const { count, error } = await query

  if (error) {
    console.error('[chat.repo] getChatUnreadCount error:', error)
    return 0
  }

  return count ?? 0
}

export function subscribeToReactions(
  familyId: string,
  onUpdate: (reaction: ChatReaction, eventType: 'INSERT' | 'DELETE') => void
): () => void {
  const channel = supabase
    .channel(`family-chat-reactions-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_reactions',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => onUpdate(payload.new as ChatReaction, 'INSERT')
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_reactions',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => onUpdate(payload.old as ChatReaction, 'DELETE')
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
