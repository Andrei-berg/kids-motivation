'use client'

// Sticky-summary style (Phase 9.3, DAYFORM-04/05) — the persistent ring +
// live coin total header that stays on screen at all times while filling.
// Pure presentational: all copy comes in as props (no i18n hook call here)
// so this component stays reusable by Phase 9.4's other fill styles.

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'
import { ProgressRing, AnimatedNum, Coin } from '@/components/kid/design/atoms'

interface StickySummaryBarProps {
  pct: number
  coins: number
  caption: string
  ringLabel: string
  lockedLabel?: string | null
}

export default function StickySummaryBar({ pct, coins, caption, ringLabel, lockedLabel }: StickySummaryBarProps) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 15, background: K.cream,
      borderBottom: `1px solid ${K.line}`,
      // Height budget: 7px top + 7px bottom padding + the 56px ring = 70px
      // total. This is the entire budget — do not add a second text row or
      // a second strip (day-fill-interaction.md: "don't let the sticky
      // summary bar cover more than ~70px").
      padding: '7px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span role="img" aria-label={ringLabel}>
        <ProgressRing pct={pct} size={56} stroke={6} color={K.mint} bg={K.lineSoft}>
          <span style={{ fontFamily: K.fNum, fontSize: 13, fontWeight: 700, color: K.ink2 }}>
            {Math.round(pct)}%
          </span>
        </ProgressRing>
      </span>

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
