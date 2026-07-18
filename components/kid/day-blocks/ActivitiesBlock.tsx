'use client'

// Extra-activities renderer (phase 05.7-04, D-09/D-18) — extracted from
// KidDayFillForm's inline extraActivitiesBody. Each activity is a ledger
// price row (LedgerRow: name · dotted leader · gold mono amount) with a
// Tick micro-tick for the toggle state. Coin values come from the activity
// rows themselves (parent-configured) — never hardcoded here.

import React from 'react'
import type { ExtraActivity } from '@/lib/models/expense.types'
import { Tick, LedgerRow } from '@/components/design/atoms'
import { base, paper } from '@/lib/design/tokens'

interface ActivitiesBlockProps {
  activities: ExtraActivity[]
  checked: Set<string>
  onToggle: (id: string) => void
  isLocked: boolean
}

export default function ActivitiesBlock({ activities, checked, onToggle, isLocked }: ActivitiesBlockProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {activities.map(act => {
        const on = checked.has(act.id)
        return (
          <button
            key={act.id}
            onClick={() => onToggle(act.id)}
            disabled={isLocked}
            style={{
              minHeight: 48, padding: '0 12px', borderRadius: 12,
              background: paper.card,
              border: on ? `1.5px solid ${paper.accent}` : `1px solid ${paper.line}`,
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              textAlign: 'left',
            }}
          >
            <Tick on={on} theme="paper"/>
            <span style={{ fontSize: 16 }} aria-hidden>{act.emoji ?? '⭐'}</span>
            {act.coins > 0 ? (
              <LedgerRow
                theme="paper"
                name={act.name}
                amount={act.coins}
                tone="earn"
                style={{ flex: 1, minWidth: 0 }}
              />
            ) : (
              <span style={{
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink,
              }}>{act.name}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
