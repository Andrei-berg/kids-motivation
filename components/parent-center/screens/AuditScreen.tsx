'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useT } from '@/lib/i18n'
import { T } from '../tokens'
import { Card } from '../ui'
import { getAuditEvents } from '@/lib/repositories/audit.repo'
import type { AuditEvent } from '@/lib/repositories/audit.repo'
import type { ParentChild } from '../types'

const PAGE_SIZE = 30

function actionIcon(type: AuditEvent['action_type']): string {
  switch (type) {
    case 'shop_approve': return '🛍️'
    case 'shop_reject': return '❌'
    case 'coin_adjust': return '💰'
    case 'badge_award': return '🏆'
    case 'settings_change': return '⚙️'
    case 'data_export': return '📤'
    case 'account_delete_request': return '🗑️'
    default: return '📋'
  }
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: T.cardHi, animation: 'auditPulse 1.4s ease-in-out infinite',
      }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          height: 14, width: '70%', borderRadius: 6,
          background: T.cardHi, animation: 'auditPulse 1.4s ease-in-out infinite',
        }}/>
        <div style={{
          height: 12, width: '40%', borderRadius: 6,
          background: T.cardHi, animation: 'auditPulse 1.4s ease-in-out 0.2s infinite',
        }}/>
      </div>
    </div>
  )
}

export default function AuditScreen({
  familyId,
  children,
}: {
  familyId: string
  children: ParentChild[]
}) {
  const t = useT()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterChild, setFilterChild] = useState<'all' | string>('all')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setOffset(0)
    setEvents([])

    async function load() {
      try {
        const data = await getAuditEvents(familyId, {
          childId: filterChild !== 'all' ? filterChild : undefined,
          limit: PAGE_SIZE,
          offset: 0,
        })
        if (!cancelled) {
          setEvents(data)
          setHasMore(data.length === PAGE_SIZE)
        }
      } catch (e) {
        console.error('[AuditScreen] load error', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [familyId, filterChild])

  async function loadMore() {
    const nextOffset = offset + PAGE_SIZE
    setLoadingMore(true)
    try {
      const data = await getAuditEvents(familyId, {
        childId: filterChild !== 'all' ? filterChild : undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      })
      setEvents(prev => [...prev, ...data])
      setOffset(nextOffset)
      setHasMore(data.length === PAGE_SIZE)
    } catch (e) {
      console.error('[AuditScreen] loadMore error', e)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes auditPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      ` }}/>

      {/* Header */}
      <div>
        <h1 style={{
          margin: 0,
          fontFamily: T.fHead, fontSize: 26, fontWeight: 600,
          color: T.text, letterSpacing: '-0.02em',
        }}>
          {t('audit.title')}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>
          {t('auditLog.subtitle', { defaultValue: 'Full transparency — all parent actions logged' })}
        </p>
      </div>

      {/* Child filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterChild('all')}
          style={{
            height: 30, padding: '0 14px', borderRadius: T.rPill,
            background: filterChild === 'all' ? T.indigo : T.cardHi,
            color: filterChild === 'all' ? '#fff' : T.muted,
            border: `1px solid ${filterChild === 'all' ? T.indigo : T.cardBorder}`,
            fontFamily: T.fBody, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all .15s',
          }}
        >
          {t('audit.filterAll')}
        </button>
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => setFilterChild(child.id)}
            style={{
              height: 30, padding: '0 14px', borderRadius: T.rPill,
              background: filterChild === child.id ? T.indigo : T.cardHi,
              color: filterChild === child.id ? '#fff' : T.muted,
              border: `1px solid ${filterChild === child.id ? T.indigo : T.cardBorder}`,
              fontFamily: T.fBody, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {child.avatar} {child.name}
          </button>
        ))}
      </div>

      {/* Event list */}
      <Card pad={16}>
        {loading ? (
          <>
            <SkeletonRow/>
            <SkeletonRow/>
            <SkeletonRow/>
          </>
        ) : events.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 0',
            color: T.muted, fontSize: 14, fontFamily: T.fBody,
          }}>
            {t('audit.noEvents')}
          </div>
        ) : (
          events.map((event, i) => {
            const coinsDelta = event.coins_delta
            return (
              <div
                key={event.id}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  padding: '10px 0',
                  borderTop: i > 0 ? `1px solid ${T.cardBorder}` : 'none',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: T.bg1, border: `1px solid ${T.cardBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {actionIcon(event.action_type)}
                </div>

                {/* Description + timestamp */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, color: T.text, fontFamily: T.fBody,
                    fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {event.description}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: T.fMono }}>
                    {format(new Date(event.created_at), 'MMM d, HH:mm')}
                  </div>
                </div>

                {/* Coins delta */}
                {coinsDelta !== null && (
                  <div style={{
                    fontFamily: T.fMono, fontSize: 13, fontWeight: 600,
                    color: coinsDelta >= 0 ? T.success : T.danger,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {coinsDelta > 0 ? '+' : ''}{coinsDelta}🪙
                  </div>
                )}
              </div>
            )
          })
        )}
      </Card>

      {/* Load more */}
      {!loading && hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            height: 40, padding: '0 20px', borderRadius: T.rPill,
            background: T.cardHi, border: `1px solid ${T.cardBorder}`,
            color: loadingMore ? T.muted : T.text,
            fontFamily: T.fBody, fontSize: 13, fontWeight: 600,
            cursor: loadingMore ? 'not-allowed' : 'pointer',
            transition: 'all .15s',
            alignSelf: 'center',
          }}
        >
          {loadingMore ? t('audit.loading') : t('audit.loadMore')}
        </button>
      )}
    </div>
  )
}
