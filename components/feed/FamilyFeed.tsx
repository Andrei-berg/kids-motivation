'use client'

// Family Feed — one shared stream of what happened in the family. Everyone in
// the family sees it; the system writes most rows (lib/services/feed.service.ts)
// and adults post free-text notes. Anyone can react and comment.
//
// `variant` picks the palette + whether the composer shows:
//   parent  → daylight theme, composer on
//   family  → daylight theme, composer on (extended members)
//   kid     → kid theme, composer off (read + react + comment only)

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { getChildren } from '@/lib/repositories/children.repo'
import {
  getFeed, getReactionsByFamily, summarizeReactions, addReaction, removeReaction,
  getComments, getCommentCounts, addComment, subscribeFeed,
} from '@/lib/repositories/feed.repo'
import { postFeedNote } from '@/app/actions/post-feed-note'
import { paper as daylightPaper, base as familyBase } from '@/lib/design/tokens'
import { K } from '@/components/kid/design/kidTheme'
import type { FeedEvent, FeedReaction, FeedComment } from '@/lib/models/feed.types'
import type { Child } from '@/lib/models/child.types'

type Variant = 'parent' | 'kid' | 'family'

const QUICK_EMOJI = ['❤️', '👍', '🔥', '🏆']
const CHILD_ACCENTS = ['#6C5CE7', '#2E9E77', '#D9548A', '#3C86C6', '#B06AC6']

function palette(variant: Variant) {
  if (variant === 'kid') {
    return {
      ground: K.cream, card: K.card, line: K.line, lineSoft: K.lineSoft,
      ink: K.ink, ink2: K.ink2, ink3: K.ink3,
      accent: K.sky, accentSoft: K.skySoft, gold: K.mangoDeep, danger: K.danger,
      fHead: K.fDisp, fBody: K.fBody, fNum: K.fNum,
    }
  }
  return {
    ground: '#F6F4EF', card: '#FFFFFF', line: '#ECE8E0', lineSoft: '#F4F2EC',
    ink: daylightPaper.ink, ink2: daylightPaper.ink2, ink3: daylightPaper.ink3,
    accent: daylightPaper.accent, accentSoft: 'rgba(91,75,212,0.10)',
    gold: daylightPaper.goldText, danger: daylightPaper.dangerText,
    fHead: familyBase.fontDisplay, fBody: familyBase.fontBody, fNum: familyBase.fontMono,
  }
}

function relTime(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const m = Math.round(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ч`
  const days = Math.round(h / 24)
  if (days < 7) return `${days} дн`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(today); y.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Сегодня'
  if (same(d, y)) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function FamilyFeed({ variant }: { variant: Variant }) {
  const C = useMemo(() => palette(variant), [variant])
  const storeFamilyId = useAppStore(s => s.familyId)

  const [familyId, setFamilyId] = useState<string | null>(storeFamilyId)
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [reactions, setReactions] = useState<Record<string, FeedReaction[]>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const canPost = variant !== 'kid' && (me?.role === 'parent' || me?.role === 'extended')

  // Resolve family + current member from the session.
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: m } = await supabase
        .from('family_members')
        .select('id, family_id, display_name, role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled || !m) return
      setMe({ id: m.id, name: m.display_name || 'Я', role: m.role })
      if (m.family_id) setFamilyId(m.family_id)
    }
    resolve()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getChildren().catch(() => [] as Child[]),
      getFeed(familyId),
      getReactionsByFamily(familyId),
      getCommentCounts(familyId),
    ]).then(([kids, ev, rx, cc]) => {
      if (cancelled) return
      setChildren(kids)
      setEvents(ev)
      setReactions(rx)
      setCommentCounts(cc)
      setHasMore(ev.length >= 30)
      setLoading(false)
    })

    const unsub = subscribeFeed(familyId, {
      onEvent: (e) => setEvents(prev => prev.some(x => x.id === e.id) ? prev.map(x => x.id === e.id ? e : x) : [e, ...prev]),
      onReaction: (r) => setReactions(prev => {
        const list = prev[r.event_id] ?? []
        if (list.some(x => x.id === r.id)) return prev
        return { ...prev, [r.event_id]: [...list, r] }
      }),
      onComment: (c) => setCommentCounts(prev => ({ ...prev, [c.event_id]: (prev[c.event_id] ?? 0) + 1 })),
    })
    return () => { cancelled = true; unsub() }
  }, [familyId])

  const childOf = (id: string | null) => children.find(c => c.id === id) ?? null
  const accentFor = (id: string | null) => {
    const idx = children.findIndex(c => c.id === id)
    return idx >= 0 ? CHILD_ACCENTS[idx % CHILD_ACCENTS.length] : C.accent
  }

  async function loadMore() {
    if (!familyId || events.length === 0) return
    const older = await getFeed(familyId, { before: events[events.length - 1].created_at })
    setEvents(prev => [...prev, ...older])
    setHasMore(older.length >= 30)
  }

  async function toggleReaction(eventId: string, emoji: string) {
    if (!familyId || !me) return
    const mine = (reactions[eventId] ?? []).some(r => r.member_id === me.id && r.emoji === emoji)
    // optimistic
    setReactions(prev => {
      const list = prev[eventId] ?? []
      return {
        ...prev,
        [eventId]: mine
          ? list.filter(r => !(r.member_id === me.id && r.emoji === emoji))
          : [...list, { id: `tmp-${Date.now()}`, event_id: eventId, family_id: familyId, member_id: me.id, emoji, created_at: new Date().toISOString() }],
      }
    })
    if (mine) await removeReaction({ eventId, memberId: me.id, emoji })
    else await addReaction({ eventId, familyId, memberId: me.id, emoji })
  }

  async function submitNote() {
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true)
    const res = await postFeedNote(text)
    setPosting(false)
    if (res.ok) setDraft('')
  }

  const groups = useMemo(() => {
    const out: { label: string; items: FeedEvent[] }[] = []
    for (const e of events) {
      const label = dayLabel(e.created_at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(e)
      else out.push({ label, items: [e] })
    }
    return out
  }, [events])

  return (
    <div style={{ background: C.ground, minHeight: '100%', fontFamily: C.fBody }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 48px' }}>
        <h1 style={{ margin: '4px 0 14px', fontFamily: C.fHead, fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>
          Лента семьи
        </h1>

        {canPost && (
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 12, marginBottom: 20, boxShadow: '0 1px 2px rgba(36,30,56,0.04), 0 8px 24px rgba(36,30,56,0.05)' }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Написать семье…"
              rows={draft ? 3 : 1}
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none',
                background: 'transparent', color: C.ink, fontFamily: C.fBody, fontSize: 14, lineHeight: 1.5,
              }}
            />
            {draft.trim() && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={submitNote}
                  disabled={posting}
                  style={{
                    height: 34, padding: '0 18px', borderRadius: 999, border: 'none',
                    background: C.accent, color: '#fff', fontFamily: C.fBody, fontSize: 13, fontWeight: 600,
                    cursor: posting ? 'default' : 'pointer', opacity: posting ? 0.6 : 1,
                  }}
                >
                  {posting ? 'Отправка…' : 'Опубликовать'}
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.ink3, fontSize: 14 }}>Загрузка…</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: C.ink3, fontSize: 14 }}>
            Пока пусто. Заполните день или отметьте награду — событие появится здесь.
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} style={{ marginBottom: 8 }}>
              <div style={{
                position: 'sticky', top: 0, zIndex: 2,
                padding: '10px 2px 8px', background: C.ground,
                fontFamily: C.fBody, fontSize: 12, fontWeight: 700, color: C.ink3,
                textTransform: 'capitalize',
              }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map(e => (
                  <EventRow
                    key={e.id}
                    e={e}
                    C={C}
                    child={childOf(e.child_id)}
                    accent={accentFor(e.child_id)}
                    me={me}
                    reactions={reactions[e.id] ?? []}
                    commentCount={commentCounts[e.id] ?? 0}
                    commentsOpen={openComments === e.id}
                    onToggleComments={() => setOpenComments(openComments === e.id ? null : e.id)}
                    onReact={(emoji) => toggleReaction(e.id, emoji)}
                    familyId={familyId!}
                    onCommentAdded={() => setCommentCounts(prev => ({ ...prev, [e.id]: (prev[e.id] ?? 0) + 1 }))}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {!loading && hasMore && events.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={loadMore} style={{
              height: 34, padding: '0 18px', borderRadius: 999,
              background: C.card, border: `1px solid ${C.line}`, color: C.ink2,
              fontFamily: C.fBody, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Показать ещё</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── One event ───────────────────────────────────────────────────────────────

function EventRow({
  e, C, child, accent, me, reactions, commentCount, commentsOpen, onToggleComments, onReact, familyId, onCommentAdded,
}: {
  e: FeedEvent
  C: ReturnType<typeof palette>
  child: Child | null
  accent: string
  me: { id: string; name: string; role: string } | null
  reactions: FeedReaction[]
  commentCount: number
  commentsOpen: boolean
  onToggleComments: () => void
  onReact: (emoji: string) => void
  familyId: string
  onCommentAdded: () => void
}) {
  const summary = summarizeReactions(reactions, me?.id ?? null)
  const isNote = e.kind === 'note'
  const glyph = e.icon || (isNote ? '✍️' : '•')
  const amountColor = e.amount != null && e.amount < 0 ? C.danger : C.gold

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          background: child ? `${accent}1F` : C.lineSoft,
          border: `1.5px solid ${child ? accent : C.line}`,
        }}>
          {child?.emoji || glyph}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, fontFamily: C.fHead, fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>
              {child && !isNote ? <span style={{ color: accent }}>{child.name}</span> : null}
              {child && !isNote ? ' · ' : ''}
              {e.title}
            </div>
            {e.amount != null && (
              <span style={{ fontFamily: C.fNum, fontSize: 14, fontWeight: 700, color: amountColor, whiteSpace: 'nowrap' }}>
                {e.amount > 0 ? '+' : ''}{e.amount}🪙
              </span>
            )}
          </div>

          {e.body && (
            <div style={{ marginTop: 4, fontFamily: C.fBody, fontSize: 13, color: C.ink2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {e.body}
            </div>
          )}

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: C.ink3, marginRight: 2 }}>{relTime(e.created_at)}</span>
            {QUICK_EMOJI.map(emoji => {
              const s = summary.find(x => x.emoji === emoji)
              const mine = s?.mine
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  style={{
                    height: 26, padding: '0 8px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${mine ? C.accent : C.line}`,
                    background: mine ? C.accentSoft : 'transparent',
                    color: C.ink2, fontSize: 12, fontFamily: C.fBody, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <span>{emoji}</span>
                  {s && s.count > 0 && <span style={{ fontFamily: C.fNum }}>{s.count}</span>}
                </button>
              )
            })}
            <button
              onClick={onToggleComments}
              style={{
                height: 26, padding: '0 8px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${commentsOpen ? C.accent : C.line}`, background: commentsOpen ? C.accentSoft : 'transparent',
                color: C.ink2, fontSize: 12, fontFamily: C.fBody, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              💬 {commentCount > 0 && <span style={{ fontFamily: C.fNum }}>{commentCount}</span>}
            </button>
          </div>

          {commentsOpen && (
            <CommentThread eventId={e.id} familyId={familyId} me={me} C={C} onAdded={onCommentAdded} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Comment thread ──────────────────────────────────────────────────────────

function CommentThread({
  eventId, familyId, me, C, onAdded,
}: {
  eventId: string
  familyId: string
  me: { id: string; name: string; role: string } | null
  C: ReturnType<typeof palette>
  onAdded: () => void
}) {
  const [comments, setComments] = useState<FeedComment[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getComments(eventId).then(setComments)
  }, [eventId])

  async function send() {
    const body = text.trim()
    if (!body || !me || sending) return
    setSending(true)
    const c = await addComment({ eventId, familyId, authorMemberId: me.id, authorName: me.name, body })
    setSending(false)
    if (c) {
      setComments(prev => [...(prev ?? []), c])
      setText('')
      onAdded()
    }
  }

  return (
    <div ref={boxRef} style={{ marginTop: 10, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10 }}>
      {comments === null ? (
        <div style={{ fontSize: 12, color: C.ink3 }}>Загрузка…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {comments.map(c => (
            <div key={c.id} style={{ fontSize: 13, lineHeight: 1.45, color: C.ink }}>
              <span style={{ fontWeight: 700, color: C.ink2 }}>{c.author_name}</span>{' '}
              <span>{c.body}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          placeholder="Комментарий…"
          style={{
            flex: 1, height: 34, padding: '0 12px', borderRadius: 999,
            border: `1px solid ${C.line}`, background: C.ground, color: C.ink,
            fontFamily: C.fBody, fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          style={{
            height: 34, padding: '0 14px', borderRadius: 999, border: 'none',
            background: C.accent, color: '#fff', fontFamily: C.fBody, fontSize: 13, fontWeight: 600,
            cursor: sending || !text.trim() ? 'default' : 'pointer', opacity: sending || !text.trim() ? 0.5 : 1,
          }}
        >
          Отправить
        </button>
      </div>
    </div>
  )
}
