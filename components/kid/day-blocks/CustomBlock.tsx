'use client'

// Custom day-block renderer (phase 05.7-04, D-09/D-18; sticky-summary row in
// 09.3-05) — extracted from KidDayFillForm's renderCustomBlock. One-tap
// QuickRow (D-05) per custom block, with the block's parent-configured price
// rendered as a coin-tag trailing element. who_fills 'parent' blocks stay
// read-only here (T-056-12 UI-level guard — the award route remains the
// authoritative backstop).

import React from 'react'
import type { DayBlock } from '@/lib/models/day-block.types'
import { Coin } from '@/components/kid/design/atoms'
import { K } from '@/components/kid/design/kidTheme'
import QuickRow from '@/components/kid/day-fill/QuickRow'

interface CustomBlockProps {
  block: DayBlock
  done: boolean
  onToggle: (block: DayBlock) => void
  isLocked: boolean
}

export default function CustomBlock({ block, done, onToggle, isLocked }: CustomBlockProps) {
  const readOnly = block.who_fills === 'parent'
  const hasPrice = block.price != null && block.price !== 0
  const trailing = hasPrice ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: K.fNum, fontSize: 13, fontWeight: 700,
      color: (block.price as number) < 0 ? K.danger : K.mintDeep,
    }}>
      {(block.price as number) > 0 ? '+' : ''}{block.price}<Coin size={15} />
    </span>
  ) : undefined
  return (
    <div data-fill-row style={{ opacity: readOnly ? 0.6 : 1 }}>
      <QuickRow
        label={block.name}
        icon={block.icon ?? '⭐'}
        done={done}
        onToggle={() => onToggle(block)}
        disabled={isLocked || readOnly}
        trailing={trailing}
      />
    </div>
  )
}
