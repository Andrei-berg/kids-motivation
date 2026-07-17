'use client'

// Room checklist renderer (phase 05.7-04, D-09/D-18) — extracted from
// KidDayFillForm's inline roomBody. Toggle callbacks are passed down from
// the form unchanged; state changes show the Tick micro-tick (<=200ms),
// never confetti. Photo-proof capture UI is carried over, restyled to paper.

import React from 'react'
import type { RoomTask } from '@/lib/models/room.types'
import { Tick } from '@/components/design/atoms'
import { base, paper } from '@/lib/design/tokens'
import { useT } from '@/lib/i18n'

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {tasks.map(task => {
          const on = checked[task.id] ?? false
          return (
            <button
              key={task.id}
              onClick={() => onToggle(task.id)}
              disabled={isLocked}
              style={{
                minHeight: 48, padding: '0 12px', borderRadius: 12,
                background: paper.card,
                border: on ? `1.5px solid ${paper.accent}` : `1px solid ${paper.line}`,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16 }} aria-hidden>{task.icon ?? '🏠'}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
              <Tick on={on} theme="paper"/>
            </button>
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
