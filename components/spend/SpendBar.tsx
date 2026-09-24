'use client'

// Stacked bar: one segment per category, width = share of the total. Shared by
// the kid banner (K palette) and the parent panel (T palette) — colours come in
// as a prop so neither screen borrows the other's tokens.

import type { SpendCategory } from '@/lib/spend/summary'

export function SpendBar({
  categories, colors, height = 12, trackColor, activeKey, onSelect,
}: {
  categories: SpendCategory[]
  colors: string[]
  height?: number
  trackColor: string
  activeKey?: string | null
  onSelect?: (key: string) => void
}) {
  if (categories.length === 0) {
    return <div style={{ height, borderRadius: 999, background: trackColor }} />
  }
  return (
    <div style={{ display: 'flex', gap: 2, height, borderRadius: 999, overflow: 'hidden', background: trackColor }}>
      {categories.map((c, i) => {
        const dim = activeKey != null && activeKey !== c.key
        const seg = (
          <div style={{
            width: '100%', height: '100%', background: colors[i % colors.length],
            opacity: dim ? 0.3 : 1, transition: 'opacity .2s',
          }} />
        )
        return onSelect ? (
          <button key={c.key} type="button" aria-label={c.name} onClick={() => onSelect(c.key)}
            style={{ flex: `${Math.max(c.pct, 0.03)} 1 0`, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', minWidth: 6 }}>
            {seg}
          </button>
        ) : (
          <div key={c.key} style={{ flex: `${Math.max(c.pct, 0.03)} 1 0`, minWidth: 6 }}>{seg}</div>
        )
      })}
    </div>
  )
}
