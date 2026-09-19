'use client'

// Grid tile primitive for the tile-sheet fill style (D-17) — a 2-column grid
// cell rendering three mutually exclusive states: at rest, done (mint), and
// net-negative today (danger tint). Stateless, copy-agnostic; tapping opens
// the category's BottomSheet (no open/onToggle pair — the sheet is a single
// overlay, not an in-place panel). No `disabled` prop: on a locked day the
// tile stays tappable because D-13 requires a locked tile to still open its
// (read-only) sheet.

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'
import { Coin } from '@/components/kid/design/atoms'

interface TileCardProps {
  label: string
  icon: string
  done: boolean
  loss?: boolean        // mutually exclusive with the mint done styling
  status: string        // subtext, e.g. "Не заполнено" / "Готово ✓"
  coins?: number        // signed per-category coin contribution; omitted when 0/absent
  onTap: () => void
}

export default function TileCard({ label, icon, done, loss, status, coins, onTap }: TileCardProps) {
  const background = loss ? `${K.danger}14` : done ? K.mintSoft : K.card
  const border = loss ? `1.5px solid ${K.danger}40` : `1.5px solid ${done ? K.mint : K.line}`
  const statusColor = loss ? K.danger : done ? K.mintDeep : K.ink3

  return (
    <button
      type="button"
      className="kid-tile"
      onClick={onTap}
      style={{
        textAlign: 'left', padding: 16, borderRadius: 18,
        position: 'relative', overflow: 'hidden', minHeight: 92,
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
        background, border,
      }}
    >
      {done && !loss && (
        <span aria-hidden style={{
          position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%',
          background: K.mint, color: '#fff', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          ✓
        </span>
      )}

      <span aria-hidden style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontFamily: K.fDisp, fontSize: 16, fontWeight: 700, color: K.ink }}>
        {label}
      </span>
      <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: statusColor }}>
        {status}
      </span>

      {!!coins && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: K.fNum, fontSize: 13, fontWeight: 700, color: coins < 0 ? K.danger : K.mintDeep }}>
          {coins > 0 ? '+' : ''}{coins}<Coin size={15} />
        </span>
      )}
    </button>
  )
}
