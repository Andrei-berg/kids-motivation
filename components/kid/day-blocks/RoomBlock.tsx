'use client'

// Room checklist renderer (phase 05.7-04, D-09/D-18; sticky-summary rows in
// 09.3-05) — extracted from KidDayFillForm's inline roomBody. Toggle
// callbacks are passed down from the form unchanged. Each task is now a
// one-tap QuickRow (D-05/D-10) instead of a 2-col button grid. Photo-proof
// capture UI is carried over unchanged, still rendered after the task list.
// The 60%-threshold award rule lives in sectionCoins/the award route — not
// mirrored here.

import React from 'react'
import type { RoomTask } from '@/lib/models/room.types'
import { base, paper } from '@/components/kid/design/kidTheme'
import { useT } from '@/lib/i18n'
import QuickRow from '@/components/kid/day-fill/QuickRow'

interface RoomBlockProps {
  tasks: RoomTask[]
  checked: Record<string, boolean>
  onToggle: (taskId: string) => void
  isLocked: boolean
  proofLocalUrl: string | null
  proofInputRef: React.RefObject<HTMLInputElement>
  onProofCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  onProofRetake: () => void
}

export default function RoomBlock({
  tasks, checked, onToggle, isLocked,
  proofLocalUrl, proofInputRef, onProofCapture, onProofRetake,
}: RoomBlockProps) {
  const t = useT()
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(task => {
          const on = checked[task.id] ?? false
          return (
            <div data-fill-row key={task.id}>
              <QuickRow
                label={task.name}
                icon={task.icon ?? '🏠'}
                done={on}
                onToggle={() => onToggle(task.id)}
                disabled={isLocked}
              />
            </div>
          )
        })}
      </div>
      {/* Photo proof */}
      {proofLocalUrl ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofLocalUrl}
            alt={t('kidFillForm.photoAttached')}
            style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: `1.5px solid ${paper.success}` }}
          />
          <div>
            <div style={{ fontFamily: base.fontBody, fontSize: 12, fontWeight: 600, color: paper.successText }}>
              {t('kidFillForm.photoAttached')}
            </div>
            <button
              onClick={onProofRetake}
              style={{
                fontFamily: base.fontBody, fontSize: 12, fontWeight: 600, color: paper.accent,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4,
              }}
            >{t('kidFillForm.retakePhoto')}</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => proofInputRef.current?.click()}
          disabled={isLocked}
          style={{
            marginTop: 12, minHeight: 44, width: '100%', borderRadius: 12,
            background: paper.card, border: `1px dashed ${paper.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: base.fontBody, fontSize: 14, fontWeight: 600,
            color: paper.ink2, cursor: isLocked ? 'not-allowed' : 'pointer',
          }}
        >{t('kidFillForm.takePhoto')}</button>
      )}
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onProofCapture}
      />
    </>
  )
}
