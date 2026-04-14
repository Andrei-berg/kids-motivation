'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatReaction } from '@/lib/models/chat.types'
import {
  getMessages,
  getReactionsByFamily,
  sendMessage,
  subscribeToMessages,
  subscribeToReactions,
} from '@/lib/repositories/chat.repo'
import type { Sticker } from '@/lib/chat-stickers'
import SendBox from './SendBox'
import { ReactionPickerBar } from './MessageReactions'
import StickerPicker from './StickerPicker'

interface ChatThreadProps {
  familyId: string
  currentMemberId: string
  senderName: string
  senderRole: 'parent' | 'child'
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatThread({
  familyId,
  currentMemberId,
  senderName,
  senderRole,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Record<string, ChatReaction[]>>({})
  const [loading, setLoading] = useState(true)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages and subscribe on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      const [data, rxns] = await Promise.all([
        getMessages(familyId),
        getReactionsByFamily(familyId),
      ])
      if (!cancelled) {
        setMessages(data)
        setReactions(rxns)
        setLoading(false)
      }
    }

    load()

    const unsubMessages = subscribeToMessages(familyId, (msg) => {
      setMessages((prev) => {
        // Avoid duplicate if optimistic message already inserted
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    const unsubReactions = subscribeToReactions(familyId, (reaction, eventType) => {
      setReactions((prev) => {
        const msgId = reaction.message_id
        const existing = prev[msgId] ?? []
        if (eventType === 'INSERT') {
          // Avoid duplicates
          if (existing.some((r) => r.id === reaction.id)) return prev
          return { ...prev, [msgId]: [...existing, reaction] }
        } else {
          // DELETE
          return { ...prev, [msgId]: existing.filter((r) => r.id !== reaction.id) }
        }
      })
    })

    return () => {
      cancelled = true
      unsubMessages()
      unsubReactions()
    }
  }, [familyId])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(text: string) {
    // Optimistic update
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      family_id: familyId,
      sender_id: currentMemberId,
      sender_name: senderName,
      sender_role: senderRole,
      message_type: 'text',
      content: text,
      sticker_id: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const saved = await sendMessage({
        familyId,
        senderId: currentMemberId,
        senderName,
        senderRole,
        messageType: 'text',
        content: text,
      })
      // Replace optimistic entry with the real message so Realtime dedup works
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m))
    } catch (err) {
      console.warn('[ChatThread] sendMessage failed:', err)
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    }
  }

  async function handleStickerSelect(sticker: Sticker) {
    const optimistic: ChatMessage = {
      id: `optimistic-sticker-${Date.now()}`,
      family_id: familyId,
      sender_id: currentMemberId,
      sender_name: senderName,
      sender_role: senderRole,
      message_type: 'sticker',
      content: sticker.emoji,
      sticker_id: sticker.id,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const saved = await sendMessage({
        familyId,
        senderId: currentMemberId,
        senderName,
        senderRole,
        messageType: 'sticker',
        content: sticker.emoji,
        stickerId: sticker.id,
      })
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m))
    } catch (err) {
      console.warn('[ChatThread] sendSticker failed:', err)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Пока нет сообщений. Напишите первым! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentMemberId

            if (msg.message_type === 'system') {
              return (
                <div key={msg.id} className="text-center text-xs text-gray-400 italic py-1">
                  {msg.content}
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <span className="text-xs font-semibold text-gray-500 mb-0.5 px-1">
                  {msg.sender_name}
                </span>
                {msg.message_type === 'sticker' ? (
                  <span style={{ fontSize: '3rem' }} className="leading-none">
                    {msg.content}
                  </span>
                ) : (
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                      isOwn
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <span className="text-xs text-gray-400 mt-0.5 px-1">
                  {formatTime(msg.created_at)}
                </span>
                {/* Reaction picker bar */}
                <ReactionPickerBar
                  message={msg}
                  reactions={reactions[msg.id] ?? []}
                  currentMemberId={currentMemberId}
                  familyId={familyId}
                />
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send area */}
      <div className="relative">
        {showStickerPicker && (
          <StickerPicker
            onSelect={(sticker) => {
              handleStickerSelect(sticker)
              setShowStickerPicker(false)
            }}
            onClose={() => setShowStickerPicker(false)}
          />
        )}
        <div className="flex items-end gap-2 px-4 pb-4">
          <button
            onClick={() => setShowStickerPicker((v) => !v)}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-xl transition-colors"
            title="Стикеры"
          >
            🎭
          </button>
          <div className="flex-1">
            <SendBox onSend={handleSend} />
          </div>
        </div>
      </div>
    </div>
  )
}
