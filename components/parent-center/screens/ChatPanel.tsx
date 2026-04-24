'use client'

import { useState, useRef, useEffect } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Icon, Coin } from '../ui'
import type { ParentChild } from '../types'
import type { RewardPurchase } from '@/lib/models/wallet.types'

type ChatMsg = {
  from: string
  text: string
  amt?: number
  time: string
  reqId?: string
}

const INITIAL_MSGS: ChatMsg[] = [
  { from: 'sys', text: "System: Earnings recorded", amt: 5, time: '14:12' },
  { from: 'parent', text: "Don't forget to clean your room 💪", time: '14:18' },
]

type Props = {
  open: boolean
  onClose: () => void
  children: ParentChild[]
  pending: RewardPurchase[]
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
}

export default function ChatPanel({ open, onClose, children, pending, onApprove, onDecline }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(INITIAL_MSGS)
  const [input, setInput] = useState('')
  const [who, setWho] = useState('family')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs, open])

  const send = () => {
    if (!input.trim()) return
    setMsgs(m => [...m, { from: 'parent', text: input, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }])
    setInput('')
  }

  const rooms = [
    { id: 'family', name: 'Family', avatar: '👨‍👩‍👧‍👦', accent: T.indigo, unread: pending.length },
    ...children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar, accent: c.accent, unread: 0 })),
  ]

  if (!open) return null

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
        {/* Header */}
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ width: 34, height: 4, background: T.faint, borderRadius: 2, margin: '0 auto 12px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: T.fHead, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
                Family chat
              </h2>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{rooms.length} members · synced</div>
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
        </div>

        {/* Room tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {rooms.map(r => (
            <button key={r.id} onClick={() => setWho(r.id)} style={{
              flex: '0 0 auto', height: 38, padding: '0 12px 0 8px',
              background: who === r.id ? T.cardHi : T.card,
              border: `1px solid ${who === r.id ? r.accent + '66' : T.cardBorder}`,
              borderRadius: T.rPill, display: 'inline-flex', alignItems: 'center', gap: 8,
              color: T.text, fontFamily: T.fBody, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              position: 'relative',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: r.accent + '33', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>{r.avatar}</span>
              {r.name}
              {r.unread > 0 && (
                <span style={{
                  minWidth: 18, height: 18, padding: '0 5px',
                  background: T.danger, borderRadius: T.rPill,
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.fMono,
                }}>{r.unread}</span>
              )}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto', padding: '8px 16px 16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Pending requests */}
          {who === 'family' && pending.map(p => (
            <Card key={p.id} pad={12} style={{ alignSelf: 'stretch', background: T.warningSoft, border: `1px solid rgba(255,217,61,0.25)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Pill tone="warn" icon="bell">SHOP REQUEST</Pill>
              </div>
              <div style={{ fontSize: 13, color: T.text, marginBottom: 10 }}>
                {children.find(c => c.id === p.child_id)?.name ?? 'Child'} wants{' '}
                <span style={{ fontFamily: T.fMono, color: T.cyan, fontWeight: 600 }}>{p.reward_title} — {p.frozen_coins}🪙</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" size="sm" icon="x" onClick={() => onDecline(p)} full>Decline</Btn>
                <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)} full>Approve</Btn>
              </div>
            </Card>
          ))}

          {msgs.map((m, i) => {
            const isMe = m.from === 'parent'
            const child = children.find(c => c.id === m.from)
            if (m.from === 'sys') {
              return (
                <div key={i} style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: T.cardHi, border: `1px solid ${T.cardBorder}`,
                  borderRadius: T.rPill, fontSize: 11, color: T.muted }}>
                  <span style={{ fontSize: 12 }}>✨</span>
                  <span>{m.text}</span>
                  {m.amt && <Coin v={m.amt}/>}
                </div>
              )
            }
            return (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%',
              }}>
                {!isMe && child && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', fontSize: 16, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${child.accent}33`,
                  }}>{child.avatar}</div>
                )}
                <div>
                  {!isMe && child && <div style={{ fontSize: 10, color: T.muted, marginBottom: 3, marginLeft: 4 }}>{child.name}</div>}
                  <div style={{
                    padding: '10px 14px',
                    background: isMe ? T.indigo : T.cardHi,
                    color: isMe ? '#fff' : T.text,
                    borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    fontSize: 14, lineHeight: 1.4,
                    boxShadow: isMe ? `0 4px 18px ${T.indigo}33` : 'none',
                  }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: T.faint, marginTop: 3, textAlign: isMe ? 'right' : 'left', marginLeft: 4, marginRight: 4, fontFamily: T.fMono }}>{m.time}</div>
                </div>
              </div>
            )
          })}
          {msgs.length === 0 && pending.length === 0 && (
            <div style={{ alignSelf: 'center', color: T.muted, fontSize: 13 }}>No messages yet</div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px 24px', borderTop: `1px solid ${T.cardBorder}`,
          background: T.bg1, display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <div style={{
            flex: 1, height: 40, padding: '0 14px',
            background: T.cardHi, border: `1px solid ${T.cardBorder}`, borderRadius: T.rPill,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Message family…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 14, fontFamily: T.fBody }}
            />
          </div>
          <button onClick={send} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: input.trim() ? T.indigo : T.cardHi,
            border: 'none', color: '#fff', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: input.trim() ? `0 4px 18px ${T.indigo}55` : 'none',
            transition: 'all .15s',
          }}>
            <Icon name="send" size={18}/>
          </button>
        </div>
      </div>
    </div>
  )
}
