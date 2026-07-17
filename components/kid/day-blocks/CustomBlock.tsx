'use client'

// Custom day-block renderer (phase 05.7-04, D-09/D-18) — extracted from
// KidDayFillForm's renderCustomBlock. One toggle row per custom block with
// a Tick micro-tick and the block's parent-configured price rendered as a
// ledger row (LedgerRow/Amount, gold only on the coin figure). who_fills
// 'parent' blocks stay read-only here (T-056-12 UI-level guard — the award
// route remains the authoritative backstop).

import React from 'react'
import type { DayBlock } from '@/lib/models/day-block.types'
import { Tick, LedgerRow } from '@/components/design/atoms'
import { base, paper } from '@/lib/design/tokens'

interface CustomBlockProps {
  block: DayBlock
  done: boolean
  onToggle: (block: DayBlock) => void
  isLocked: boolean
}

export default function CustomBlock({ block, done, onToggle, isLocked }: CustomBlockProps) {
  const readOnly = block.who_fills === 'parent'
  const hasPrice = block.price != null && block.price !== 0
  return (
    <button
      onClick={() => onToggle(block)}
      disabled={isLocked || readOnly}
      style={{
        width: '100%', minHeight: 48, padding: '0 12px', borderRadius: 12,
        background: paper.card,
        border: done ? `1.5px solid ${paper.accent}` : `1px solid ${paper.line}`,
        display: 'flex', alignItems: 'center', gap: 8,
        cursor: (isLocked || readOnly) ? 'not-allowed' : 'pointer',
        opacity: readOnly ? 0.6 : 1,
        textAlign: 'left',
      }}
    >
      <Tick on={done} theme="paper"/>
      <span style={{ fontSize: 16 }} aria-hidden>{block.icon ?? '⭐'}</span>
      {hasPrice ? (
        <LedgerRow
          theme="paper"
          name={block.name}
          amount={block.price as number}
          tone={(block.price as number) > 0 ? 'earn' : 'penalty'}
          style={{ flex: 1, minWidth: 0 }}
        />
      ) : (
        <span style={{
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink,
        }}>{block.name}</span>
      )}
    </button>
  )
}
