'use client'

// Slim persistent coin total for the story-stepper fill style (D-09) —
// structurally StickySummaryBar with the completion ring removed. Stateless,
// copy-agnostic. No completion-percent or ring-label props, and no
// completion-ring import: the story-stepper shell conveys progress via
// DotTrack instead.

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'
import { AnimatedNum, Coin } from '@/components/kid/design/atoms'

interface StepCoinHeaderProps {
  coins: number
  caption: string
  lockedLabel?: string | null
}

export default function StepCoinHeader({ coins, caption, lockedLabel }: StepCoinHeaderProps) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 15, background: K.cream,
      borderBottom: `1px solid ${K.line}`,
      padding: '7px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AnimatedNum
            value={coins}
            duration={500}
            style={{ fontFamily: K.fDisp, fontSize: 20, fontWeight: 900, color: K.mangoDeep }}
          />
          <Coin size={17} />
        </span>
        <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3 }}>
          {caption}
        </span>
      </div>

      {lockedLabel && (
        <span style={{
          padding: '3px 9px', borderRadius: 999, background: K.card,
          border: `1.5px solid ${K.line}`, fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
          color: K.ink2,
        }}>
          {lockedLabel}
        </span>
      )}
    </div>
  )
}
