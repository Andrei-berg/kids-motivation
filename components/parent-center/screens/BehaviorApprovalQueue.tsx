'use client'

// components/parent-center/screens/BehaviorApprovalQueue.tsx
// Dedicated parent approval queue for child-proposed behavior tags (Phase
// 5.9 Plan 07). Mirrors the shop purchase-approval mental model (Dashboard's
// pending-purchase cards) — one row per pending behavior_marks row, with
// Approve/Reject actions calling the service-role actions in
// app/parent/behavior/actions.ts. Approval flips status only; crediting
// happens on the next /api/wallet/award POST (plan 06) — this screen never
// touches coins directly.

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'
import { Btn } from '@/components/parent-center/ui'
import { Amount } from '@/components/design/atoms'
import { supabase } from '@/lib/supabase'
import { getChildren } from '@/lib/repositories/children.repo'
import { approveBehaviorMark, rejectBehaviorMark } from '@/app/parent/behavior/actions'
import type { BehaviorMark } from '@/lib/models/behavior.types'

type PendingRow = {
  mark: BehaviorMark
  tagName: string
  tagIcon: string
  tagPrice: number
  childName: string
}

export default function BehaviorApprovalQueue() {
  const t = useT()
  const { familyId } = useAppStore()

  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    if (familyId) load()
  }, [familyId])

  async function load() {
    if (!familyId) return
    setLoading(true)
    setError('')
    try {
      const { data: marks, error: marksError } = await supabase
        .from('behavior_marks')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (marksError) throw marksError

      const pendingMarks = (marks ?? []) as BehaviorMark[]
      if (pendingMarks.length === 0) {
        setRows([])
        return
      }

      const tagIds = Array.from(new Set(pendingMarks.map(m => m.tag_id)))
      const [{ data: tags, error: tagsError }, children] = await Promise.all([
        supabase.from('behavior_tags').select('id, name, icon, price').in('id', tagIds),
        getChildren().catch(() => []),
      ])
      if (tagsError) throw tagsError

      const tagById = new Map(
        (tags ?? []).map((tg: { id: string; name: string; icon: string | null; price: number }) => [tg.id, tg])
      )
      const childById = new Map(children.map(c => [c.id, c]))

      setRows(
        pendingMarks.map(mark => {
          const tag = tagById.get(mark.tag_id)
          return {
            mark,
            tagName: tag?.name ?? '',
            tagIcon: tag?.icon ?? '⭐',
            tagPrice: tag?.price ?? 0,
            childName: childById.get(mark.child_id)?.name ?? t('chat.child'),
          }
        })
      )
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(markId: string) {
    setActingId(markId)
    try {
      await approveBehaviorMark(markId)
      await load()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setActingId(null)
    }
  }

  async function handleReject(markId: string) {
    setActingId(markId)
    try {
      await rejectBehaviorMark(markId)
      await load()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setActingId(null)
    }
  }

  const representativeChildName = rows[0]?.childName ?? t('chat.child')

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          🕓 {t('settings.behaviorApproval.title')}
        </div>
        <div style={{ fontSize: 13, color: T.textDim }}>
          {t('settings.behaviorApproval.subtitle')}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 8, color: T.danger, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: T.textDim, fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: T.faint, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: T.textDim, marginBottom: 4 }}>
            {t('settings.behaviorApproval.emptyTitle')}
          </div>
          <div>{t('settings.behaviorApproval.emptyBody', { childName: representativeChildName })}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(({ mark, tagName, tagIcon, tagPrice, childName }) => (
            <div
              key={mark.id}
              style={{
                padding: '10px 16px',
                background: T.card,
                border: `1px solid ${T.cardBorderHi}`,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{tagIcon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{tagName}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{childName}</div>
                </div>
                <Amount value={tagPrice} money theme="ink" size="md" signed />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Btn
                    variant="danger"
                    size="lg"
                    full
                    onClick={() => handleReject(mark.id)}
                    disabled={actingId === mark.id}
                  >
                    {t('settings.behaviorApproval.rejectBtn')}
                  </Btn>
                </div>
                <div style={{ flex: 1 }}>
                  <Btn
                    variant="success"
                    size="lg"
                    full
                    onClick={() => handleApprove(mark.id)}
                    disabled={actingId === mark.id}
                  >
                    {t('settings.behaviorApproval.approveBtn')}
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
