// Pure day-fill maths for the sticky-summary style (Phase 9.3, DAYFORM-04/05).
// No React, no imports from components/ — kept side-effect-free so both
// computeFillProgress and diffSectionCoins are provable by unit tests alone.

// ── computeFillProgress ─────────────────────────────────────────────────────
// D-09: the completion ring's denominator counts only categories that have
// something to do for this child today. `applicable` is the caller-computed
// per-category "is this category relevant today" map (e.g. combining the
// existing dayBlocksEnabled/visibleBlocks gating with non-zero-option checks
// for sport sections / behavior tags / activities). A category absent from
// `applicable`, or present but `false`, is excluded entirely from both the
// numerator and denominator — it never shows as a stuck 0/1 "incomplete"
// slice. `done` is the existing per-category "has any input" boolean map
// (KidDayFillForm.tsx's `done` object, ~line 1136) — a multi-sub-item
// category (e.g. several grade subjects) is still ONE slot here because the
// caller already reduced it to one boolean per category.
export interface FillProgress {
  doneCount: number
  total: number
  pct: number
}

export function computeFillProgress(
  applicable: Record<string, boolean>,
  done: Record<string, boolean>,
): FillProgress {
  const applicableKeys = Object.keys(applicable).filter(key => applicable[key])
  const total = applicableKeys.length
  const doneCount = applicableKeys.filter(key => done[key] === true).length
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100)
  return { doneCount, total, pct }
}

// ── diffSectionCoins ─────────────────────────────────────────────────────────
// D-12: the per-row floating coin feedback's delta source. Derives every
// per-row coin flyup from two snapshots of the already-computed sectionCoins
// map (KidDayFillForm.tsx's sectionCoins useMemo) — no coin amount is ever
// recalculated or invented client-side here. A key removed between snapshots
// (D-10: an untoggle) yields the exact negative inverse of its prior value
// (D-11: a loss), and a negative value appearing/growing more negative is
// passed straight through untouched.
export interface CoinDelta {
  key: string
  delta: number
}

export function diffSectionCoins(
  prev: Record<string, number>,
  next: Record<string, number>,
): CoinDelta[] {
  const deltas: CoinDelta[] = []
  const seen = new Set<string>()

  for (const key of Object.keys(next)) {
    seen.add(key)
    const delta = (next[key] ?? 0) - (prev[key] ?? 0)
    if (delta !== 0) deltas.push({ key, delta })
  }

  for (const key of Object.keys(prev)) {
    if (seen.has(key)) continue
    const delta = (next[key] ?? 0) - (prev[key] ?? 0)
    if (delta !== 0) deltas.push({ key, delta })
  }

  return deltas
}
