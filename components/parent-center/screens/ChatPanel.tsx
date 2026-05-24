'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { T } from '../tokens'
import { Btn, Pill, Icon } from '../ui'
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

// ─── Activity classification (dark theme) ─────────────────────────────────────
type ActivityType = 'streak' | 'badge' | 'coins_gain' | 'coins_loss' | 'generic'
interface ActivityInfo { icon: string; type: ActivityType; label: string }

function classifySystemMessage(content: string | null): ActivityInfo {
  if (!content) return { icon: '✨', type: 'generic', label: '' }
  if (content.includes('🔥')) return { icon: '🔥', type: 'streak', label: content }
  if (content.includes('значок')) return { icon: '🏆', type: 'badge', label: content }
  if (content.includes('монет')) {
    if (content.match(/\+\d+/)) return { icon: '🪙', type: 'coins_gain', label: content }
    if (content.match(/-\d+/)) return { icon: '💸', type: 'coins_loss', label: content }
  }
  return { icon: '✨', type: 'generic', label: content }
}

const DARK_ACT: Record<ActivityType, { bg: string; border: string; text: string; glow?: string }> = {
  coins_gain: { bg: 'rgba(0,230,118,.08)', border: 'rgba(0,230,118,.25)', text: '#00E676' },
  coins_loss: { bg: 'rgba(255,107,107,.08)', border: 'rgba(255,107,107,.25)', text: '#FF8A80' },
  streak:     { bg: 'rgba(255,217,61,.08)', border: 'rgba(255,217,61,.3)', text: '#FFD93D', glow: '0 0 16px rgba(255,217,61,.18)' },
  badge:      { bg: 'rgba(255,193,7,.08)', border: 'rgba(255,193,7,.4)', text: '#FFC107', glow: '0 0 20px rgba(255,193,7,.2)' },
  generic:    { bg: 'rgba(108,92,231,.08)', border: 'rgba(108,92,231,.25)', text: '#8B7BF5' },
}

function stripLeadingEmoji(s: string): string {
  return s.replace(/^[🔥🏆💰💸✨🎯🌟⭐]\s*/, '')
}

// ─── Message processing ───────────────────────────────────────────────────────
type ProcessedItem =
  | { kind: 'message'; data: ChatMessage }
  | { kind: 'activity_group'; messages: ChatMessage[]; key: string }
  | { kind: 'date_sep'; label: string; key: string }

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yest = new Date(); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Сегодня'
  if (d.toDateString() === yest.toDateString()) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function processMessages(msgs: ChatMessage[]): ProcessedItem[] {
  const out: ProcessedItem[] = []
  let lastDate = ''
  let i = 0
  while (i < msgs.length) {
    const msg = msgs[i]
    const dateStr = new Date(msg.created_at).toDateString()
    if (dateStr !== lastDate) {
      out.push({ kind: 'date_sep', label: formatDate(msg.created_at), key: `sep-${dateStr}` })
      lastDate = dateStr
    }
    if (msg.message_type === 'system') {
      const group = [msg]
      const base = new Date(msg.created_at).getTime()
      let j = i + 1
      while (
        j < msgs.length &&
        msgs[j].message_type === 'system' &&
        new Date(msgs[j].created_at).getTime() - base <= 600_000
      ) { group.push(msgs[j]); j++ }
      if (group.length === 1) out.push({ kind: 'message', data: msg })
      else out.push({ kind: 'activity_group', messages: group, key: `grp-${msg.id}` })
      i = j
    } else {
      out.push({ kind: 'message', data: msg })
      i++
    }
  }
  return out
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DarkDateSep({ label, desktop }: { label: string; desktop?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: desktop ? '6px 0' : '8px 0', userSelect: 'none' }}>
      <div style={{ flex: 1, height: 1, background: T.cardBorder }} />
      <span style={{
        fontFamily: T.fBody, fontSize: desktop ? 9 : 10, fontWeight: 600, color: T.faint,
        padding: '2px 10px', background: T.cardHi, borderRadius: T.rPill,
        border: `1px solid ${T.cardBorder}`, letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.cardBorder }} />
    </div>
  )
}

function DarkSingleActivity({ msg, desktop }: { msg: ChatMessage; desktop?: boolean }) {
  const { icon, type, label } = classifySystemMessage(msg.content)
  const c = DARK_ACT[type]
  if (type === 'badge') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: desktop ? '4px 0' : '5px 0' }}>
        <div style={{
          background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 14,
          padding: desktop ? '8px 14px' : '9px 16px', boxShadow: c.glow,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: desktop ? 30 : 34, height: desktop ? 30 : 34, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,193,7,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: desktop ? 16 : 18,
          }}>{icon}</div>
          <div>
            <div style={{ fontFamily: T.fBody, fontSize: 9, fontWeight: 700, color: '#FFC107', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>Значок!</div>
            <div style={{ fontFamily: T.fHead, fontSize: desktop ? 11 : 12, fontWeight: 600, color: c.text, lineHeight: 1.3 }}>
              {stripLeadingEmoji(label)}
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: desktop ? '2px 0' : '3px 0' }}>
      <div style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: T.rPill,
        padding: desktop ? '4px 12px' : '5px 14px', boxShadow: c.glow,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ fontSize: desktop ? 12 : 13 }}>{icon}</span>
        <span style={{ fontFamily: T.fBody, fontSize: desktop ? 11 : 12, fontWeight: 600, color: c.text }}>
          {stripLeadingEmoji(label)}
        </span>
      </div>
    </div>
  )
}

function DarkActivityBurst({ messages, desktop }: { messages: ChatMessage[]; desktop?: boolean }) {
  const [open, setOpen] = useState(false)
  const time = formatTime(messages[0].created_at)
  let delta = 0
  for (const m of messages) {
    const g = m.content?.match(/\+(\d+)/); if (g) delta += parseInt(g[1])
    const l = m.content?.match(/-(\d+)/);  if (l) delta -= parseInt(l[1])
  }
  const icons = Array.from(new Set(messages.map(m => classifySystemMessage(m.content).icon))).slice(0, 4)
  const count = messages.length
  const countLabel = count === 1 ? '1 событие' : count < 5 ? `${count} события` : `${count} событий`

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: desktop ? '3px 0' : '4px 0' }}>
      <div style={{
        background: T.cardHi, border: `1px solid ${T.cardBorderHi}`, borderRadius: desktop ? 12 : 14,
        overflow: 'hidden', maxWidth: desktop ? 260 : 290, width: '100%',
        boxShadow: `0 2px 12px rgba(0,0,0,.25)`,
      }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: '100%', padding: desktop ? '8px 12px' : '9px 14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {icons.map((ic, idx) => <span key={idx} style={{ fontSize: desktop ? 13 : 14, marginLeft: idx > 0 ? -3 : 0, display: 'block' }}>{ic}</span>)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fBody, fontSize: desktop ? 11 : 12, fontWeight: 600, color: T.textDim }}>
              {countLabel}
              {delta !== 0 && (
                <span style={{ marginLeft: 6, color: delta > 0 ? T.success : T.danger, fontFamily: T.fMono }}>
                  {delta > 0 ? '+' : ''}{delta} 🪙
                </span>
              )}
            </div>
            <div style={{ fontFamily: T.fMono, fontSize: 9, color: T.faint }}>{time}</div>
          </div>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 4, paddingBottom: 6 }}>
            {messages.map(m => {
              const { icon, type, label } = classifySystemMessage(m.content)
              const c = DARK_ACT[type]
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: desktop ? '3px 12px' : '4px 14px' }}>
                  <span style={{ fontSize: desktop ? 12 : 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontFamily: T.fBody, fontSize: desktop ? 11 : 12, color: c.text, lineHeight: 1.4 }}>
                    {stripLeadingEmoji(label)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ShopBanner({
  pending, children, onApprove, onDecline, desktop,
}: {
  pending: RewardPurchase[]
  children: ParentChild[]
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
  desktop?: boolean
}) {
  const [open, setOpen] = useState(true)
  const t = useT()
  if (pending.length === 0) return null

  return (
    <div style={{
      background: 'rgba(255,217,61,.07)',
      border: `1px solid rgba(255,217,61,.2)`,
      borderRadius: desktop ? 10 : 0,
      margin: desktop ? '0 0 6px' : 0,
      overflow: 'hidden', flexShrink: 0,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: desktop ? '7px 12px' : '8px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: desktop ? 13 : 15 }}>🛒</span>
        <span style={{ fontFamily: T.fBody, fontSize: desktop ? 11 : 12, fontWeight: 700, color: T.warning, flex: 1, textAlign: 'left' }}>
          {t('chat.shopRequest')} · {pending.length}
        </span>
        <div style={{
          minWidth: 18, height: 18, padding: '0 5px',
          background: T.danger, borderRadius: T.rPill,
          color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono,
        }}>{pending.length}</div>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke={T.warning} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: `0 ${desktop ? 10 : 12}px ${desktop ? 8 : 10}px`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map(p => (
            <div key={p.id} style={{
              background: T.card, borderRadius: desktop ? 8 : 10,
              padding: desktop ? '8px 10px' : '10px 12px',
              border: `1px solid ${T.cardBorder}`,
            }}>
              <div style={{ fontFamily: T.fBody, fontSize: desktop ? 11 : 12, color: T.text, marginBottom: desktop ? 7 : 8 }}>
                <span style={{ color: T.cyan, fontWeight: 600 }}>
                  {children.find(c => c.id === p.child_id)?.name ?? t('chat.child')}
                </span>
                {' '}{t('chat.wants')}{' '}
                <span style={{ fontFamily: T.fMono, color: T.warning, fontWeight: 600 }}>
                  {p.reward_title} — {p.frozen_coins}🪙
                </span>
              </div>
              <div style={{ display: 'flex', gap: desktop ? 5 : 6 }}>
                <Btn variant="ghost" size="sm" icon="x" onClick={() => onDecline(p)} full>{t('chat.decline')}</Btn>
                <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)} full>{t('chat.approve')}</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ChatPanel({ open, onClose, children, pending, onApprove, onDecline, familyId, desktop }: Props) {
  const t = useT()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [who, setWho] = useState('family')
  const [parentMemberId, setParentMemberId] = useState<string | null>(null)
  const [parentName, setParentName] = useState('Parent')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

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
      if (member) { setParentMemberId(member.id); setParentName(member.display_name || 'Parent') }
    }
    initParent()
  }, [familyId])

  useEffect(() => {
    if (!familyId) return
    setLoading(true)
    getMessages(familyId).then(data => { setMessages(data); setLoading(false) })
    const unsub = subscribeToMessages(familyId, (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    })
    return () => unsub()
  }, [familyId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open, pending])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || !familyId || !parentMemberId) return
    setInput('')
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`, family_id: familyId,
      sender_id: parentMemberId, sender_name: parentName, sender_role: 'parent',
      message_type: 'text', content: text, sticker_id: null, photo_url: null,
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
    { id: 'family', name: t('chat.familyRoom'), avatar: '👨‍👩‍👧‍👦', accent: T.indigo },
    ...children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar, accent: c.accent })),
  ]

  const visibleMessages = who === 'family'
    ? messages
    : messages.filter(m => m.sender_id === who || m.sender_role === 'parent')

  const processed = processMessages(visibleMessages)

  if (!open && !desktop) return null

  const renderRoomTabs = () => (
    <div style={{
      display: 'flex', gap: desktop ? 4 : 6, overflowX: 'auto',
      scrollbarWidth: 'none' as const,
      padding: desktop ? '0 0 10px' : '0 16px 12px', flexShrink: 0,
      borderBottom: `1px solid ${T.cardBorder}`,
    }}>
      {rooms.map(r => {
        const isActive = who === r.id
        return (
          <button key={r.id} onClick={() => setWho(r.id)} style={{
            flex: '0 0 auto', height: desktop ? 26 : 34,
            padding: desktop ? '0 10px 0 7px' : '0 12px 0 8px',
            background: isActive ? `${r.accent}18` : 'transparent',
            border: `1px solid ${isActive ? r.accent + '55' : T.cardBorder}`,
            borderRadius: T.rPill,
            display: 'inline-flex', alignItems: 'center', gap: desktop ? 5 : 7,
            color: isActive ? T.text : T.muted,
            fontFamily: T.fBody, fontSize: desktop ? 11 : 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all .12s',
          }}>
            <span style={{ fontSize: desktop ? 12 : 14 }}>{r.avatar}</span>
            <span>{r.name}</span>
          </button>
        )
      })}
    </div>
  )

  const renderMessages = () => (
    <div
      ref={scrollRef}
      style={{
        flex: 1, overflowY: 'auto',
        padding: desktop ? '10px 12px' : '8px 14px 12px',
        display: 'flex', flexDirection: 'column', gap: desktop ? 4 : 6,
      }}
    >
      {/* Shop requests banner — only in family room */}
      {who === 'family' && (
        <ShopBanner
          pending={pending}
          children={children}
          onApprove={onApprove}
          onDecline={onDecline}
          desktop={desktop}
        />
      )}

      {loading ? (
        <div style={{ alignSelf: 'center', color: T.muted, fontSize: 12, padding: 20 }}>{t('common.loading')}</div>
      ) : processed.length === 0 && !(who === 'family' && pending.length > 0) ? (
        <div style={{ alignSelf: 'center', color: T.muted, fontSize: desktop ? 12 : 13, marginTop: 20 }}>{t('chat.noMessages')}</div>
      ) : (
        processed.map((item) => {
          if (item.kind === 'date_sep') {
            return <DarkDateSep key={item.key} label={item.label} desktop={desktop} />
          }
          if (item.kind === 'activity_group') {
            return <DarkActivityBurst key={item.key} messages={item.messages} desktop={desktop} />
          }

          const m = item.data
          if (m.message_type === 'system') {
            return <DarkSingleActivity key={m.id} msg={m} desktop={desktop} />
          }

          const isMe = m.sender_id === parentMemberId
          const child = children.find(c => m.sender_role !== 'parent' && m.sender_name === c.name)
          const avatarBg = isMe ? `${T.indigo}28` : child ? `${child.accent}28` : `${T.cyan}20`
          const avatarIcon = isMe ? parentName.charAt(0).toUpperCase() : (child?.avatar ?? '👦')
          const avatarIsEmoji = !isMe
          const avatarSize = desktop ? 24 : 28
          const fontSize = desktop ? 13 : 14

          return (
            <div key={m.id} style={{
              display: 'flex', gap: desktop ? 6 : 8, alignItems: 'flex-end',
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: desktop ? '85%' : '82%',
            }}>
              {!isMe && (
                <div style={{
                  width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: avatarBg,
                  fontSize: avatarIsEmoji ? (desktop ? 13 : 15) : (desktop ? 11 : 12),
                  fontFamily: T.fHead, fontWeight: 700, color: T.text,
                }}>
                  {avatarIcon}
                </div>
              )}
              <div>
                {!isMe && (
                  <div style={{
                    fontSize: 9, marginBottom: desktop ? 2 : 3,
                    marginLeft: desktop ? 3 : 4, fontFamily: T.fBody, fontWeight: 600,
                    color: child ? child.accent : T.cyan,
                  }}>
                    {m.sender_name}
                  </div>
                )}
                <div style={{
                  padding: desktop ? '7px 11px' : '9px 13px',
                  fontSize,
                  fontFamily: T.fBody,
                  background: isMe ? T.indigo : T.cardHi,
                  color: isMe ? '#fff' : T.text,
                  borderRadius: isMe
                    ? (desktop ? '14px 14px 3px 14px' : '16px 16px 4px 16px')
                    : (desktop ? '3px 14px 14px 14px' : '4px 16px 16px 16px'),
                  lineHeight: 1.45,
                  boxShadow: isMe ? `0 4px ${desktop ? 12 : 16}px ${T.indigo}44` : 'none',
                }}>
                  {m.content}
                </div>
                <div style={{
                  fontSize: 9, color: T.faint, marginTop: desktop ? 2 : 3,
                  textAlign: isMe ? 'right' : 'left',
                  marginLeft: desktop ? 3 : 4, marginRight: desktop ? 3 : 4,
                  fontFamily: T.fMono,
                }}>
                  {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  const renderInput = () => (
    <div style={{
      padding: desktop ? '8px 10px 10px' : '10px 12px 20px',
      borderTop: `1px solid ${T.cardBorder}`,
      background: T.bg1, display: 'flex', gap: desktop ? 6 : 8, alignItems: 'center', flexShrink: 0,
    }}>
      <div style={{
        flex: 1, height: desktop ? 34 : 40, padding: '0 12px',
        background: T.cardHi, border: `1px solid ${T.cardBorder}`, borderRadius: T.rPill,
        display: 'flex', alignItems: 'center',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('chat.messagePlaceholder')}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: T.text, fontSize: desktop ? 13 : 14, fontFamily: T.fBody,
          }}
        />
      </div>
      <button onClick={send} style={{
        width: desktop ? 34 : 40, height: desktop ? 34 : 40, borderRadius: '50%',
        background: input.trim() ? T.indigo : T.cardHi,
        border: `1px solid ${input.trim() ? 'transparent' : T.cardBorder}`,
        color: '#fff', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: input.trim() ? `0 4px ${desktop ? 12 : 16}px ${T.indigo}55` : 'none',
        transition: 'all .15s',
      }}>
        <Icon name="send" size={desktop ? 15 : 17}/>
      </button>
    </div>
  )

  const renderHeader = () => (
    <div style={{ padding: desktop ? '16px 14px 0' : '10px 16px 14px', flexShrink: 0 }}>
      {desktop ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: T.fHead, fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>
                {t('chat.title')}
              </div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                {rooms.length} {t('chat.members')} · live
              </div>
            </div>
            {pending.length > 0 && (
              <div style={{
                minWidth: 18, height: 18, padding: '0 5px',
                background: T.danger, borderRadius: T.rPill,
                color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono,
              }}>{pending.length}</div>
            )}
          </div>
          {renderRoomTabs()}
        </>
      ) : (
        <>
          <div style={{ width: 34, height: 4, background: T.faint, borderRadius: 2, margin: '0 auto 12px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: T.fHead, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
                {t('chat.title')}
              </h2>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {rooms.length} {t('chat.members')} · synced
              </div>
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
        </>
      )}
    </div>
  )

  if (desktop) {
    return (
      <div style={{
        background: T.bg1, borderLeft: `1px solid ${T.cardBorder}`,
        display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      }}>
        {renderHeader()}
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
        boxShadow: '0 -20px 60px rgba(0,0,0,.5)', overflow: 'hidden',
      }}>
        {renderHeader()}
        {renderMessages()}
        {renderInput()}
      </div>
    </div>
  )
}
