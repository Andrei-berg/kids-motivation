'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Icon, Coin } from '../ui'
import type { ParentChild } from '../types'
import type { RewardPurchase } from '@/lib/models/wallet.types'
import type { ChatMessage } from '@/lib/models/chat.types'
import { getMessages, sendMessage, subscribeToMessages } from '@/lib/repositories/chat.repo'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  children: ParentChild[]
  pending: RewardPurchase[]
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
  familyId: string
  desktop?: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPanel({ open, onClose, children, pending, onApprove, onDecline, familyId, desktop }: Props) {
  const t = useT()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [who, setWho] = useState('family')
  const [parentMemberId, setParentMemberId] = useState<string | null>(null)
  const [parentName, setParentName] = useState('Parent')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load parent member identity
  useEffect(() => {
    if (!familyId) return
    async function initParent() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase
        .from('family_members')
        .select('id, display_name')
        .eq('user_id', user.id)
        .eq('family_id', familyId)
        .maybeSingle()
      if (member) {
        setParentMemberId(member.id)
        setParentName(member.display_name || 'Parent')
      }
    }
    initParent()
  }, [familyId])

  // Load messages + subscribe
  useEffect(() => {
    if (!familyId) return
    setLoading(true)
    getMessages(familyId).then(data => {
      setMessages(data)
      setLoading(false)
    })
    const unsub = subscribeToMessages(familyId, (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    })
    return () => unsub()
  }, [familyId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, pending])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || !familyId || !parentMemberId) return
    setInput('')
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      family_id: familyId,
      sender_id: parentMemberId,
      sender_name: parentName,
      sender_role: 'parent',
      message_type: 'text',
      content: text,
      sticker_id: null,
      photo_url: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    try {
      const saved = await sendMessage({ familyId, senderId: parentMemberId, senderName: parentName, senderRole: 'parent', messageType: 'text', content: text })
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
  }, [input, familyId, parentMemberId, parentName])

  const rooms = [
    { id: 'family', name: t('chat.familyRoom'), avatar: '👨‍👩‍👧‍👦', accent: T.indigo, unread: pending.length },
    ...children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar, accent: c.accent, unread: 0 })),
  ]

  const visibleMessages = who === 'family'
    ? messages
    : messages.filter(m => m.sender_id === who || (m.sender_role === 'parent'))

  const pendingCount = pending.length

  if (!open && !desktop) return null

  const renderMessages = () => (
    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: desktop ? '10px 14px' : '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: desktop ? 8 : 10 }}>
      {/* Shop requests in family room */}
      {who === 'family' && pending.map(p => (
        <Card key={p.id} pad={12} style={{ alignSelf: 'stretch', background: T.warningSoft, border: `1px solid rgba(255,217,61,0.25)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: desktop ? 8 : 10 }}>
            <Pill tone="warn" icon="bell">{t('chat.shopRequest')}</Pill>
          </div>
          <div style={{ fontSize: desktop ? 12 : 13, color: T.text, marginBottom: desktop ? 10 : 10 }}>
            {children.find(c => c.id === p.child_id)?.name ?? t('chat.child')}{' '}
            {t('chat.wants')}{' '}
            <span style={{ fontFamily: T.fMono, color: T.cyan, fontWeight: 600 }}>{p.reward_title} — {p.frozen_coins}🪙</span>
          </div>
          <div style={{ display: 'flex', gap: desktop ? 6 : 8 }}>
            <Btn variant="ghost" size="sm" icon="x" onClick={() => onDecline(p)} full>{t('chat.decline')}</Btn>
            <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)} full>{t('chat.approve')}</Btn>
          </div>
        </Card>
      ))}

      {loading ? (
        <div style={{ alignSelf: 'center', color: T.muted, fontSize: 12, padding: 20 }}>{t('common.loading')}</div>
      ) : visibleMessages.length === 0 && pending.length === 0 ? (
        <div style={{ alignSelf: 'center', color: T.muted, fontSize: desktop ? 12 : 13 }}>{t('chat.noMessages')}</div>
      ) : (
        visibleMessages.map((m, i) => {
          const isMe = m.sender_id === parentMemberId
          const child = children.find(c => {
            const childId = c.id
            return m.sender_id !== parentMemberId && m.sender_name === c.name
          })

          if (m.message_type === 'system') {
            return (
              <div key={m.id} style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: desktop ? '5px 10px' : '6px 12px', background: T.cardHi, border: `1px solid ${T.cardBorder}`,
                borderRadius: T.rPill, fontSize: desktop ? 10 : 11, color: T.muted }}>
                <span style={{ fontSize: desktop ? 11 : 12 }}>✨</span>
                <span>{m.content}</span>
              </div>
            )
          }

          const bubbleSize = desktop ? { fontSize: 13, padding: '8px 12px' } : { fontSize: 14, padding: '10px 14px' }
          const avatarSize = desktop ? 24 : 28
          const avatarFont = desktop ? 14 : 16

          return (
            <div key={m.id} style={{
              display: 'flex', gap: desktop ? 6 : 8, alignItems: 'flex-end',
              alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: desktop ? '84%' : '82%',
            }}>
              {!isMe && (
                <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', fontSize: avatarFont, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: child ? `${child.accent}33` : `${T.indigo}33` }}>
                  {child ? child.avatar : '👦'}
                </div>
              )}
              <div>
                {!isMe && <div style={{ fontSize: 9, color: T.muted, marginBottom: desktop ? 2 : 3, marginLeft: desktop ? 3 : 4 }}>{m.sender_name}</div>}
                <div style={{
                  ...bubbleSize,
                  background: isMe ? T.indigo : T.cardHi,
                  color: isMe ? '#fff' : T.text,
                  borderRadius: isMe ? (desktop ? '16px 16px 3px 16px' : '18px 18px 4px 18px') : (desktop ? '3px 16px 16px 16px' : '4px 18px 18px 18px'),
                  lineHeight: 1.4,
                  boxShadow: isMe ? `0 4px ${desktop ? 14 : 18}px ${T.indigo}33` : 'none',
                }}>{m.content}</div>
                <div style={{ fontSize: 9, color: T.faint, marginTop: desktop ? 2 : 3, textAlign: isMe ? 'right' : 'left', marginLeft: desktop ? 3 : 4, marginRight: desktop ? 3 : 4, fontFamily: T.fMono }}>{formatTime(m.created_at)}</div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  const renderInput = () => (
    <div style={{
      padding: desktop ? '8px 10px 12px' : '10px 12px 24px',
      borderTop: `1px solid ${T.cardBorder}`,
      background: T.bg1, display: 'flex', gap: desktop ? 7 : 8, alignItems: 'center', flexShrink: 0,
    }}>
      <div style={{
        flex: 1, height: desktop ? 36 : 40, padding: '0 12px',
        background: T.cardHi, border: `1px solid ${T.cardBorder}`, borderRadius: T.rPill,
        display: 'flex', alignItems: 'center',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('chat.messagePlaceholder')}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: desktop ? 13 : 14, fontFamily: T.fBody }}
        />
      </div>
      <button onClick={send} style={{
        width: desktop ? 36 : 40, height: desktop ? 36 : 40, borderRadius: '50%',
        background: input.trim() ? T.indigo : T.cardHi,
        border: 'none', color: '#fff', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: input.trim() ? `0 4px ${desktop ? 14 : 18}px ${T.indigo}55` : 'none',
        transition: 'all .15s',
      }}>
        <Icon name="send" size={desktop ? 16 : 18}/>
      </button>
    </div>
  )

  const renderRoomTabs = () => (
    <div style={{
      display: 'flex', gap: desktop ? 5 : 8, overflowX: 'auto', scrollbarWidth: 'none' as any,
      paddingBottom: 12, borderBottom: `1px solid ${T.cardBorder}`,
      padding: desktop ? '0 0 12px' : '0 16px 12px', flexShrink: 0,
    }}>
      {rooms.map(r => (
        <button key={r.id} onClick={() => setWho(r.id)} style={{
          flex: '0 0 auto', height: desktop ? 28 : 38, padding: desktop ? '0 9px 0 6px' : '0 12px 0 8px',
          background: who === r.id ? T.cardHi : 'transparent',
          border: `1px solid ${who === r.id ? r.accent + '55' : T.cardBorder}`,
          borderRadius: T.rPill, display: 'inline-flex', alignItems: 'center', gap: desktop ? 5 : 8,
          color: who === r.id ? T.text : T.muted,
          fontFamily: T.fBody, fontSize: desktop ? 11 : 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
        }}>
          <span style={{ fontSize: desktop ? 12 : 14 }}>{r.avatar}</span>
          <span>{r.name}</span>
          {r.unread > 0 && (
            <span style={{
              minWidth: desktop ? 15 : 18, height: desktop ? 15 : 18, padding: '0 4px',
              background: T.danger, borderRadius: T.rPill,
              color: '#fff', fontSize: desktop ? 9 : 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono,
            }}>{r.unread}</span>
          )}
        </button>
      ))}
    </div>
  )

  if (desktop) {
    return (
      <div style={{
        background: T.bg1, borderLeft: `1px solid ${T.cardBorder}`,
        display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 14px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: T.fHead, fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{t('chat.title')}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{rooms.length} {t('chat.members')} · live</div>
            </div>
            {pendingCount > 0 && <Pill tone="warn" style={{ height: 20, fontSize: 9 }}>{pendingCount}</Pill>}
          </div>
          {renderRoomTabs()}
        </div>
        {renderMessages()}
        {renderInput()}
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(10,10,18,0.75)', backdropFilter: 'blur(12px)',
      zIndex: 100, display: 'flex', flexDirection: 'column',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        marginTop: 60, flex: 1,
        background: T.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${T.cardBorderHi}`, borderBottom: 'none',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
          <div style={{ width: 34, height: 4, background: T.faint, borderRadius: 2, margin: '0 auto 12px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: T.fHead, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>{t('chat.title')}</h2>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{rooms.length} {t('chat.members')} · synced</div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: T.cardHi, border: `1px solid ${T.cardBorder}`,
              color: T.text, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="x" size={14}/>
            </button>
          </div>
          {renderRoomTabs()}
        </div>
        {renderMessages()}
        {renderInput()}
      </div>
    </div>
  )
}
