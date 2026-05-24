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
import { compressImage, uploadPhoto, getSignedPhotoUrl } from '@/lib/photo-upload'
import { PhotoLightbox } from './PhotoLightbox'
import type { Sticker } from '@/lib/chat-stickers'
import SendBox from './SendBox'
import { ReactionPickerBar } from './MessageReactions'
import StickerPicker from './StickerPicker'
import { useT } from '@/lib/i18n'

interface ChatThreadProps {
  familyId: string
  currentMemberId: string
  senderName: string
  senderRole: 'parent' | 'child'
}

// ─── Design tokens (kid light theme) ─────────────────────────────────────────
const KT = {
  coral: '#FF6B35', coralDeep: '#E8551F', coralSoft: '#FFE4D6',
  teal: '#4ECDC4', plum: '#6C5CE7', plumSoft: '#E9E5FB',
  sun: '#FFE66D', sunDeep: '#F5C83D',
  ink: '#1A1423', ink2: '#3D3447', ink3: '#7A7386',
  line: '#EEE8DF', lineSoft: '#F5EFE4', bg: '#FFFBF5', card: '#FFFFFF',
  fDisp: '"Nunito", system-ui, sans-serif',
  fBody: '"DM Sans", system-ui, sans-serif',
  fNum:  '"JetBrains Mono", ui-monospace, monospace',
}

// ─── View mode ────────────────────────────────────────────────────────────────
type ViewMode = 'mixed' | 'split'
type ChatTab  = 'messages' | 'activity'
const VIEW_MODE_KEY = 'chat_view_mode_v1'

function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'mixed'
  return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'mixed'
}

// ─── Activity classification ──────────────────────────────────────────────────
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

const ACT: Record<ActivityType, { bg: string; border: string; text: string; glow?: string }> = {
  coins_gain: { bg: 'linear-gradient(135deg,#F0FFF4,#DCFCE7)', border: '#86EFAC', text: '#14532D' },
  coins_loss: { bg: 'linear-gradient(135deg,#FFF7ED,#FFEDD5)', border: '#FED7AA', text: '#7C2D12' },
  streak:     { bg: 'linear-gradient(135deg,#FFF7ED,#FEF3C7)', border: '#FDE68A', text: '#92400E', glow: '0 0 18px rgba(251,191,36,.3)' },
  badge:      { bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '#F59E0B', text: '#78350F', glow: '0 0 24px rgba(245,158,11,.4)' },
  generic:    { bg: 'linear-gradient(135deg,#F8F6FF,#EDE9FE)', border: '#C4B5FD', text: '#5B21B6' },
}

function stripLeadingEmoji(s: string): string {
  return s.replace(/^[🔥🏆💰💸✨🎯🌟⭐]\s*/, '')
}

// ─── Message processing (for mixed mode) ─────────────────────────────────────
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

// ─── Sub-components: UI controls ─────────────────────────────────────────────

function ViewModeToggle({ mode, onToggle }: { mode: ViewMode; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 14px 4px', flexShrink: 0 }}>
      <div style={{
        display: 'inline-flex', background: KT.lineSoft,
        borderRadius: 999, padding: 2, border: `1px solid ${KT.line}`,
      }}>
        {(['mixed', 'split'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => mode !== m && onToggle()}
            style={{
              padding: '3px 11px', borderRadius: 999, border: 'none',
              cursor: mode !== m ? 'pointer' : 'default',
              fontFamily: KT.fBody, fontSize: 11, fontWeight: 600,
              background: mode === m ? KT.card : 'transparent',
              color: mode === m ? KT.ink2 : KT.ink3,
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              transition: 'all .15s',
            }}
          >
            {m === 'mixed' ? 'Лента' : 'Раздельно'}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatTabBar({ active, onChange }: { active: ChatTab; onChange: (t: ChatTab) => void }) {
  return (
    <div style={{
      display: 'flex', padding: '2px 14px 10px', gap: 6, flexShrink: 0,
      borderBottom: `1px solid ${KT.line}`,
    }}>
      {([
        ['messages', '💬 Сообщения', KT.coral],
        ['activity', '✨ Активность', KT.plum],
      ] as [ChatTab, string, string][]).map(([tab, label, color]) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: '6px 16px', borderRadius: 999, cursor: 'pointer',
            fontFamily: KT.fBody, fontSize: 13, fontWeight: 600,
            background: active === tab ? color : 'transparent',
            color: active === tab ? '#fff' : KT.ink3,
            border: active === tab ? 'none' : `1px solid ${KT.line}`,
            boxShadow: active === tab ? `0 3px 10px ${color}44` : 'none',
            transition: 'all .15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Sub-components: message rendering ───────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', userSelect: 'none' }}>
      <div style={{ flex: 1, height: 1, background: KT.line }} />
      <span style={{
        fontFamily: KT.fBody, fontSize: 11, fontWeight: 600, color: KT.ink3,
        padding: '3px 12px', background: KT.lineSoft, borderRadius: 999,
        border: `1px solid ${KT.line}`, letterSpacing: '0.04em',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: KT.line }} />
    </div>
  )
}

function SingleActivity({ msg }: { msg: ChatMessage }) {
  const { icon, type, label } = classifySystemMessage(msg.content)
  const c = ACT[type]
  if (type === 'badge') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 16px' }}>
        <div style={{
          background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 18,
          padding: '10px 18px', boxShadow: c.glow,
          display: 'flex', alignItems: 'center', gap: 12, maxWidth: 300,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, flexShrink: 0, background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
          <div>
            <div style={{ fontFamily: KT.fBody, fontSize: 10, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Новый значок!</div>
            <div style={{ fontFamily: KT.fDisp, fontSize: 14, fontWeight: 800, color: c.text, lineHeight: 1.3 }}>{stripLeadingEmoji(label)}</div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 16px' }}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: '5px 14px', boxShadow: c.glow, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: KT.fBody, fontSize: 12, fontWeight: 600, color: c.text }}>{stripLeadingEmoji(label)}</span>
      </div>
    </div>
  )
}

function ActivityBurst({ messages }: { messages: ChatMessage[] }) {
  const [open, setOpen] = useState(false)
  const time = formatTime(messages[0].created_at)
  let delta = 0
  for (const m of messages) {
    const g = m.content?.match(/\+(\d+)/); if (g) delta += parseInt(g[1])
    const l = m.content?.match(/-(\d+)/);  if (l) delta -= parseInt(l[1])
  }
  const icons = Array.from(new Set(messages.map(m => classifySystemMessage(m.content).icon))).slice(0, 4)
  const count = messages.length
  const countLabel = count < 5 ? `${count} события` : `${count} событий`

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 16px' }}>
      <div style={{ background: 'linear-gradient(135deg,#FFFBF5,#FFF7ED)', border: '1.5px solid #FDE68A', borderRadius: 18, overflow: 'hidden', maxWidth: 300, width: '100%', boxShadow: '0 2px 14px rgba(251,191,36,.18)' }}>
        <button onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {icons.map((ic, idx) => <span key={idx} style={{ fontSize: 16, marginLeft: idx > 0 ? -4 : 0, display: 'block' }}>{ic}</span>)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: KT.fBody, fontSize: 12, fontWeight: 700, color: '#92400E' }}>
              {countLabel}
              {delta !== 0 && <span style={{ marginLeft: 8, color: delta > 0 ? '#14532D' : '#7C2D12', fontFamily: KT.fNum }}>{delta > 0 ? '+' : ''}{delta} 🪙</span>}
            </div>
            <div style={{ fontFamily: KT.fBody, fontSize: 10, color: '#A16207' }}>{time}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M2 4L6 8L10 4" stroke="#A16207" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div style={{ borderTop: '1px solid #FDE68A', paddingTop: 4, paddingBottom: 6 }}>
            {messages.map(m => {
              const { icon, type, label } = classifySystemMessage(m.content)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 14px' }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontFamily: KT.fBody, fontSize: 12, color: ACT[type].text, lineHeight: 1.4 }}>{stripLeadingEmoji(label)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Avatar({ name, role }: { name: string; role: 'parent' | 'child' }) {
  const color = role === 'parent' ? KT.plum : KT.coral
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}22`, border: `1.5px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KT.fDisp, fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Activity feed (split mode) ───────────────────────────────────────────────

interface DayGroup { dateStr: string; label: string; msgs: ChatMessage[]; delta: number }

function buildDayGroups(msgs: ChatMessage[]): DayGroup[] {
  const days: DayGroup[] = []
  for (const msg of msgs) {
    const dateStr = new Date(msg.created_at).toDateString()
    let day = days.find(d => d.dateStr === dateStr)
    if (!day) { day = { dateStr, label: formatDate(msg.created_at), msgs: [], delta: 0 }; days.push(day) }
    day.msgs.push(msg)
    const g = msg.content?.match(/\+(\d+)/); if (g) day.delta += parseInt(g[1])
    const l = msg.content?.match(/-(\d+)/);  if (l) day.delta -= parseInt(l[1])
  }
  return days
}

function ActivityFeed({ messages }: { messages: ChatMessage[] }) {
  const systemMsgs = messages.filter(m => m.message_type === 'system')

  if (systemMsgs.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: KT.ink3 }}>
        <span style={{ fontSize: 40 }}>✨</span>
        <span style={{ fontFamily: KT.fBody, fontSize: 14 }}>Нет активности</span>
      </div>
    )
  }

  const days = buildDayGroups(systemMsgs)

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12, paddingBottom: 8 }}>
      {[...days].reverse().map(day => (
        <div key={day.dateStr} style={{ marginBottom: 16 }}>
          {/* Day header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 8px' }}>
            <span style={{ fontFamily: KT.fBody, fontSize: 12, fontWeight: 700, color: KT.ink2 }}>{day.label}</span>
            <div style={{ flex: 1, height: 1, background: KT.line }} />
            {day.delta !== 0 && (
              <span style={{
                fontFamily: KT.fNum, fontSize: 11, fontWeight: 700,
                color: day.delta > 0 ? '#14532D' : '#7C2D12',
                padding: '2px 8px', borderRadius: 999,
                background: day.delta > 0 ? '#DCFCE7' : '#FFEDD5',
                border: `1px solid ${day.delta > 0 ? '#86EFAC' : '#FED7AA'}`,
              }}>
                {day.delta > 0 ? '+' : ''}{day.delta} 🪙
              </span>
            )}
          </div>
          {/* Event rows */}
          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...day.msgs].reverse().map(m => {
              const { icon, type, label } = classifySystemMessage(m.content)
              const c = ACT[type]
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 12px', borderRadius: 12,
                  background: c.bg, border: `1px solid ${c.border}`,
                  boxShadow: c.glow,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontFamily: KT.fBody, fontSize: 13, color: c.text, lineHeight: 1.4, flex: 1 }}>
                    {stripLeadingEmoji(label)}
                  </span>
                  <span style={{ fontFamily: KT.fNum, fontSize: 10, color: KT.ink3, flexShrink: 0, marginTop: 2 }}>
                    {formatTime(m.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const mediaBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: KT.lineSoft, border: `1px solid ${KT.line}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, cursor: 'pointer', flexShrink: 0, outline: 'none',
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ChatThread({
  familyId,
  currentMemberId,
  senderName,
  senderRole,
}: ChatThreadProps) {
  const t = useT()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Record<string, ChatReaction[]>>({})
  const [loading, setLoading] = useState(true)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<{ file: File; localUrl: string } | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode)
  const [activeTab, setActiveTab] = useState<ChatTab>('messages')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function toggleViewMode() {
    const next: ViewMode = viewMode === 'mixed' ? 'split' : 'mixed'
    setViewMode(next)
    localStorage.setItem(VIEW_MODE_KEY, next)
    if (next === 'mixed') setActiveTab('messages')
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [data, rxns] = await Promise.all([getMessages(familyId), getReactionsByFamily(familyId)])
      if (!cancelled) { setMessages(data); setReactions(rxns); setLoading(false) }
    }
    load()
    const unsubMessages = subscribeToMessages(familyId, (msg) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
    })
    const unsubReactions = subscribeToReactions(familyId, (reaction, eventType) => {
      setReactions((prev) => {
        const msgId = reaction.message_id
        const existing = prev[msgId] ?? []
        if (eventType === 'INSERT') {
          if (existing.some((r) => r.id === reaction.id)) return prev
          return { ...prev, [msgId]: [...existing, reaction] }
        }
        return { ...prev, [msgId]: existing.filter((r) => r.id !== reaction.id) }
      })
    })
    return () => { cancelled = true; unsubMessages(); unsubReactions() }
  }, [familyId])

  useEffect(() => {
    if (activeTab === 'messages') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeTab])

  async function handleSend(text: string) {
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`, family_id: familyId,
      sender_id: currentMemberId, sender_name: senderName, sender_role: senderRole,
      message_type: 'text', content: text, sticker_id: null, photo_url: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const saved = await sendMessage({ familyId, senderId: currentMemberId, senderName, senderRole, messageType: 'text', content: text })
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m))
    } catch (err) {
      console.warn('[ChatThread] sendMessage failed:', err)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    }
  }

  async function handleStickerSelect(sticker: Sticker) {
    const optimistic: ChatMessage = {
      id: `optimistic-sticker-${Date.now()}`, family_id: familyId,
      sender_id: currentMemberId, sender_name: senderName, sender_role: senderRole,
      message_type: 'sticker', content: sticker.emoji, sticker_id: sticker.id,
      photo_url: null, created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const saved = await sendMessage({ familyId, senderId: currentMemberId, senderName, senderRole, messageType: 'sticker', content: sticker.emoji, stickerId: sticker.id })
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m))
    } catch (err) {
      console.warn('[ChatThread] sendSticker failed:', err)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview({ file, localUrl: URL.createObjectURL(file) })
    setPhotoCaption('')
    e.target.value = ''
  }

  async function handlePhotoSend() {
    if (!photoPreview) return
    setPhotoUploading(true)
    const optimisticId = `optimistic-photo-${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId, family_id: familyId,
      sender_id: currentMemberId, sender_name: senderName, sender_role: senderRole,
      message_type: 'photo', content: photoCaption.trim() || null, sticker_id: null,
      photo_url: photoPreview.localUrl, created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    const { file, localUrl } = photoPreview
    setPhotoPreview(null); setPhotoCaption('')
    try {
      const compressed = await compressImage(file)
      const path = `${familyId}/chat/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      await uploadPhoto(compressed, path)
      const signedUrl = await getSignedPhotoUrl(path)
      const saved = await sendMessage({ familyId, senderId: currentMemberId, senderName, senderRole, messageType: 'photo', content: photoCaption.trim() || undefined, photoUrl: signedUrl })
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? saved : m)))
      URL.revokeObjectURL(localUrl)
    } catch (err) {
      console.warn('[ChatThread] photo send failed:', err)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      URL.revokeObjectURL(localUrl)
    } finally {
      setPhotoUploading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${KT.coral}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // --- Determine what to show ---
  // In split/messages: filter out system events
  // In split/activity: only system events → ActivityFeed
  const chatMessages = viewMode === 'split'
    ? messages.filter(m => m.message_type !== 'system')
    : messages
  const processed = processMessages(chatMessages)
  const showSendArea = viewMode === 'mixed' || activeTab === 'messages'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: KT.bg }}>
      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoSelect} />
      <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />

      {/* View mode toggle */}
      <ViewModeToggle mode={viewMode} onToggle={toggleViewMode} />

      {/* Tab bar (split mode only) */}
      {viewMode === 'split' && <ChatTabBar active={activeTab} onChange={setActiveTab} />}

      {/* Content area */}
      {viewMode === 'split' && activeTab === 'activity' ? (
        <ActivityFeed messages={messages} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 4, display: 'flex', flexDirection: 'column' }}>
          {processed.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: KT.ink3 }}>
              <span style={{ fontSize: 40 }}>💬</span>
              <span style={{ fontFamily: KT.fBody, fontSize: 14 }}>{t('chat.noMessages')}</span>
            </div>
          ) : (
            processed.map((item) => {
              if (item.kind === 'date_sep') return <DateSep key={item.key} label={item.label} />
              if (item.kind === 'activity_group') return <ActivityBurst key={item.key} messages={item.messages} />

              const msg = item.data
              if (msg.message_type === 'system') return <SingleActivity key={msg.id} msg={msg} />

              const isOwn = msg.sender_id === currentMemberId
              const roleColor = msg.sender_role === 'parent' ? KT.plum : KT.coral

              return (
                <div key={msg.id} style={{ padding: '3px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row', maxWidth: '78%' }}>
                      <Avatar name={msg.sender_name} role={msg.sender_role} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                        {!isOwn && <span style={{ fontFamily: KT.fBody, fontSize: 11, fontWeight: 600, color: roleColor, marginBottom: 3, marginLeft: 2 }}>{msg.sender_name}</span>}
                        {msg.message_type === 'photo' ? (
                          <div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.photo_url ?? ''} alt="photo" style={{ width: 180, borderRadius: 16, cursor: 'pointer', objectFit: 'cover', display: 'block', boxShadow: '0 4px 18px rgba(0,0,0,.12)' }} onClick={() => msg.photo_url && setLightboxUrl(msg.photo_url)} />
                            {msg.content && <p style={{ fontFamily: KT.fBody, fontSize: 12, color: KT.ink3, marginTop: 4, marginLeft: 4, marginBottom: 0 }}>{msg.content}</p>}
                          </div>
                        ) : msg.message_type === 'sticker' ? (
                          <span style={{ fontSize: '3rem', lineHeight: 1, display: 'block' }}>{msg.content}</span>
                        ) : (
                          <div style={{
                            padding: '9px 14px',
                            background: isOwn ? `linear-gradient(135deg,${KT.coral},${KT.coralDeep})` : KT.card,
                            color: isOwn ? '#fff' : KT.ink,
                            borderRadius: isOwn ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                            fontFamily: KT.fBody, fontSize: 14, lineHeight: 1.5,
                            boxShadow: isOwn ? `0 4px 14px ${KT.coral}55` : '0 2px 8px rgba(26,20,35,.07)',
                            border: isOwn ? 'none' : `1px solid ${KT.line}`,
                          }}>{msg.content}</div>
                        )}
                        <span style={{ fontFamily: KT.fBody, fontSize: 10, color: KT.ink3, marginTop: 3, alignSelf: isOwn ? 'flex-end' : 'flex-start', marginRight: isOwn ? 2 : 0, marginLeft: isOwn ? 0 : 2 }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                    <div style={{ paddingLeft: isOwn ? 0 : 38, paddingRight: isOwn ? 38 : 0 }}>
                      <ReactionPickerBar message={msg} reactions={reactions[msg.id] ?? []} currentMemberId={currentMemberId} familyId={familyId} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && showSendArea && (
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${KT.line}`, background: KT.lineSoft }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview.localUrl} alt="preview" style={{ width: 68, height: 68, borderRadius: 12, objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <input type="text" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} placeholder={t('chat.caption')} style={{ width: '100%', padding: '6px 12px', borderRadius: 8, border: `1px solid ${KT.line}`, fontFamily: KT.fBody, fontSize: 13, outline: 'none', background: KT.card, color: KT.ink, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => { setPhotoPreview(null); setPhotoCaption('') }} style={{ fontFamily: KT.fBody, fontSize: 12, color: KT.ink3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('chat.cancel')}</button>
                <button onClick={handlePhotoSend} disabled={photoUploading} style={{ fontFamily: KT.fBody, fontSize: 12, fontWeight: 700, background: KT.coral, color: '#fff', border: 'none', padding: '4px 16px', borderRadius: 999, cursor: 'pointer', opacity: photoUploading ? 0.6 : 1 }}>{photoUploading ? t('chat.sending') : t('chat.send')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send area */}
      {showSendArea && (
        <div style={{ position: 'relative', background: KT.bg, borderTop: `1px solid ${KT.line}` }}>
          {showStickerPicker && (
            <StickerPicker onSelect={(sticker) => { handleStickerSelect(sticker); setShowStickerPicker(false) }} onClose={() => setShowStickerPicker(false)} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 10px' }}>
            <button onClick={() => setShowStickerPicker(v => !v)} style={mediaBtnStyle} title={t('chat.stickers')}>🎭</button>
            <button onClick={() => cameraInputRef.current?.click()} style={mediaBtnStyle} title={t('chat.camera')}>📷</button>
            <button onClick={() => galleryInputRef.current?.click()} style={mediaBtnStyle} title={t('chat.gallery')}>🖼️</button>
            <div style={{ flex: 1 }}><SendBox onSend={handleSend} /></div>
          </div>
        </div>
      )}

      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}
