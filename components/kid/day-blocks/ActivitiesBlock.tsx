'use client'

// Extra-activities renderer (phase 05.7-04, D-09/D-18; sticky-summary rows in
// 09.3-05) — extracted from KidDayFillForm's inline extraActivitiesBody. Each
// activity is now its own one-tap QuickRow (D-05) with its coin tag as
// trailing content — no shared panel. Coin values come from the activity
// rows themselves (parent-configured) — never hardcoded here.

import React from 'react'
import type { ExtraActivity } from '@/lib/models/expense.types'
import { Coin } from '@/components/kid/design/atoms'
import { K } from '@/components/kid/design/kidTheme'
import QuickRow from '@/components/kid/day-fill/QuickRow'

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
        const trailing = act.coins !== 0 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: K.fNum, fontSize: 13, fontWeight: 700,
            color: act.coins < 0 ? K.danger : K.mintDeep,
          }}>
            {act.coins > 0 ? '+' : ''}{act.coins}<Coin size={15} />
          </span>
        ) : undefined
        return (
          <div data-fill-row key={act.id}>
            <QuickRow
              label={act.name}
              icon={act.emoji ?? '⭐'}
              done={on}
              onToggle={() => onToggle(act.id)}
              disabled={isLocked}
              trailing={trailing}
            />
          </div>
        )
      })}
    </div>
  )
}
