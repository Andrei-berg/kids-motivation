import { supabase } from '@/lib/supabase'
import type { ChatMessage, MessageType } from '@/lib/models/chat.types'

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
