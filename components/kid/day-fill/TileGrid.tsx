'use client'

// Tile-sheet grid container (D-01/D-02/D-03) — a strict 2-column grid of
// `TileCard`s plus exactly ONE shared `BottomSheet`, never one sheet per
// tile. Stateless: `openId` is owned by `KidDayFillForm` so reopening a
// sheet never resets anything and the grid never remounts. Does not sort,
// filter, or re-order `tiles` — the caller's order is authoritative
// (UI-SPEC: "the grid never remounts or re-sorts on sheet close").
//
// The sheet's children are wrapped in a flyup-anchor marker div so the coin
// flyup anchors inside the open sheet (D-16) — KidDayFillForm's existing
// onPointerDownCapture handler walks up to the nearest such marker, and React
// propagates pointerdown events from this subtree normally (BottomSheet is
// a plain fixed-position overlay, not a portal).

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'
import TileCard from '@/components/kid/day-fill/TileCard'
import BottomSheet from '@/components/kid/day-fill/BottomSheet'

export interface FillTile {
  id: string
  label: string
  icon: string
  done: boolean
  loss: boolean
  status: string
  coins?: number
  body: React.ReactNode
}

interface TileGridProps {
  tiles: FillTile[]
  openId: string | null
  onOpen: (id: string) => void
  onClose: () => void
  subtitle: string             // t('kidFillForm.tileSheetSub')
  closeLabel: string           // t('kidFillForm.sheetClose')
  doneLabel: string | null     // t('kidFillForm.sheetDone'); null on a locked day (D-13)
  emptyState?: React.ReactNode // the existing nothingToday card, when applicable
}

export default function TileGrid({ tiles, openId, onOpen, onClose, subtitle, closeLabel, doneLabel, emptyState }: TileGridProps) {
  const openTile = tiles.find(t => t.id === openId) ?? null

  return (
    <>
      <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, padding: '10px 16px 0' }}>
        {subtitle}
      </div>

      {emptyState}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>
        {tiles.map(tile => (
          <TileCard
            key={tile.id}
            label={tile.label}
            icon={tile.icon}
            done={tile.done}
            loss={tile.loss}
            status={tile.status}
            coins={tile.coins}
            onTap={() => onOpen(tile.id)}
          />
        ))}
      </div>

      <BottomSheet
        open={openTile !== null}
        title={openTile?.label ?? ''}
        icon={openTile?.icon}
        onClose={onClose}
        closeLabel={closeLabel}
        doneLabel={doneLabel}
      >
        <div data-fill-row>{openTile?.body}</div>
      </BottomSheet>
    </>
  )
}
