'use client'

// components/parent-center/screens/BackfillRequestQueue.tsx
// Parent queue for the "kid fills a past day" flow (2026-09-10). Mirrors
// BehaviorApprovalQueue. Two sections:
//   1. Запросы   (status 'requested')  → Одобрить / Отклонить  (decideBackfillRequest)
//   2. На проверку (status 'submitted') → Засчитать / Отклонить (reviewBackfillDay)
// "Засчитать" flips status to 'done' then POSTs /api/wallet/award {childId,date}
// as the parent (ungated) — coins are credited there, never in the action.

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'
import { Btn } from '@/components/parent-center/ui'
import { getChildren } from '@/lib/repositories/children.repo'
import { getBackfillRequests } from '@/lib/repositories/backfill.repo'
import { decideBackfillRequest, reviewBackfillDay } from '@/app/parent/backfill/actions'
import type { DayFillRequest } from '@/lib/models/child.types'

type Row = DayFillRequest & { childName: string }

export default function BackfillRequestQueue({ compact = false }: { compact?: boolean } = {}) {
  const t = useT()
  const { familyId } = useAppStore()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    setError('')
    try {
      const [reqs, children] = await Promise.all([
        getBackfillRequests(familyId, { status: ['requested', 'submitted'] }),
        getChildren().catch(() => []),
      ])
      const nameById = new Map(children.map((c) => [c.id, c.name]))
      setRows(reqs.map((r) => ({ ...r, childName: nameById.get(r.child_id) ?? t('chat.child') })))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [familyId, t])

  useEffect(() => { load() }, [load])

  async function act(fn: () => Promise<unknown>, id: string) {
    setActingId(id)
    setError('')
    try {
      await fn()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setActingId(null)
    }
  }

  const decide = (r: Row, d: 'approve' | 'reject') =>
    act(() => decideBackfillRequest(r.id, d), r.id)

  const review = (r: Row, d: 'approve' | 'reject') =>
    act(async () => {
      await reviewBackfillDay(r.id, d)
      if (d === 'approve') {
        // Parent-initiated award → ungated → credits the reviewed day.
        await fetch('/api/wallet/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: r.child_id, date: r.date }),
        }).catch(() => {})
      }
    }, r.id)

  const requested = rows.filter((r) => r.status === 'requested')
  const submitted = rows.filter((r) => r.status === 'submitted')

  if (compact && !loading && rows.length === 0 && !error) return null

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          📅 {t('parentCenter.backfill.title')}
        </div>
        <div style={{ fontSize: 13, color: T.textDim }}>{t('parentCenter.backfill.subtitle')}</div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 8, color: T.danger, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: T.textDim, fontSize: 13 }}>{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        !compact && (
          <div style={{ textAlign: 'center', padding: 24, color: T.faint, fontSize: 13 }}>
            {t('parentCenter.backfill.empty')}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requested.length > 0 && (
            <Section title={t('parentCenter.backfill.requestedHeading')}>
              {requested.map((r) => (
                <RequestCard key={r.id} childName={r.childName} date={r.date}>
                  <Btn variant="danger" size="lg" full disabled={actingId === r.id} onClick={() => decide(r, 'reject')}>
                    {t('parentCenter.backfill.reject')}
                  </Btn>
                  <Btn variant="success" size="lg" full disabled={actingId === r.id} onClick={() => decide(r, 'approve')}>
                    {t('parentCenter.backfill.approveRequest')}
                  </Btn>
                </RequestCard>
              ))}
            </Section>
          )}
          {submitted.length > 0 && (
            <Section title={t('parentCenter.backfill.submittedHeading')}>
              {submitted.map((r) => (
                <RequestCard key={r.id} childName={r.childName} date={r.date}>
                  <Btn variant="danger" size="lg" full disabled={actingId === r.id} onClick={() => review(r, 'reject')}>
                    {t('parentCenter.backfill.reject')}
                  </Btn>
                  <Btn variant="success" size="lg" full disabled={actingId === r.id} onClick={() => review(r, 'approve')}>
                    {t('parentCenter.backfill.credit')}
                  </Btn>
                </RequestCard>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function RequestCard({ childName, date, children }: { childName: string; date: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 16px', background: T.card, border: `1px solid ${T.cardBorderHi}`, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>📅</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{date}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{childName}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{children}</div>
    </div>
  )
}
