'use client'

// Receipt-style ledger card (phase 05.7-04, D-09) — the family-bank
// replacement for KidDayFillForm's old FillSection wrapper. One card per
// day block: paper surface, hairline rule under the header, Heading-role
// title (18px/700 Bitter). All colors come from lib/design/tokens.

import React from 'react'
import { base, paper } from '@/lib/design/tokens'

interface BlockCardProps {
  title: string
  icon?: string
  sub?: string
  children: React.ReactNode
}

export default function BlockCard({ title, icon, sub, children }: BlockCardProps) {
  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{
        background: paper.card,
        border: `1px solid ${paper.line}`,
        borderRadius: 16,
        padding: 16,
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, paddingBottom: 8, marginBottom: 12,
          borderBottom: `1px solid ${paper.line}`,
        }}>
          <h3 style={{
            margin: 0, fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700,
            lineHeight: 1.2, color: paper.ink,
            display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
          }}>
            {icon && <span style={{ fontSize: 16 }} aria-hidden>{icon}</span>}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          </h3>
          {sub && (
            <span style={{
              fontFamily: base.fontBody, fontSize: 12, fontWeight: 600,
              color: paper.ink3, whiteSpace: 'nowrap', flexShrink: 0,
            }}>{sub}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
