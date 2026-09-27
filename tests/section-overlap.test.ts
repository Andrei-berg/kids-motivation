import { describe, it, expect, vi } from 'vitest'

// expenses.repo imports the '@/lib/supabase' browser singleton, which throws at
// import time without NEXT_PUBLIC_SUPABASE_URL — stub it, same as audit-repo.test.ts.
// The two functions under test here are pure and never touch the client.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { dateRangesOverlap, normalizeSectionName } from '@/lib/repositories/expenses.repo'

// Regression test for the real incident: Alim ended up with two "Вольная
// борьба" section rows (same trainer/address/cost) whose date ranges
// overlapped, and lib/spend/summary.ts billed both — double-charging August
// and September. addSection/updateSection now call assertNoOverlappingSection,
// built on these two pure helpers.
describe('dateRangesOverlap', () => {
  it('detects the exact incident shape: an open-ended new section starting before an old one ends', () => {
    // old: 2026-05-26 → 2026-09-04 (archived), new: 2026-07-31 → open-ended
    expect(dateRangesOverlap('2026-05-26', '2026-09-04', '2026-07-31', null)).toBe(true)
  })

  it('does not flag two sections that are back-to-back with no gap overlap', () => {
    // old ends the day before the new one starts — no shared day
    expect(dateRangesOverlap('2026-05-26', '2026-09-04', '2026-09-05', null)).toBe(false)
  })

  it('treats a null start/end as open-ended in both directions', () => {
    expect(dateRangesOverlap(null, null, '2026-01-01', '2026-01-02')).toBe(true)
    expect(dateRangesOverlap('2020-01-01', '2020-01-02', null, null)).toBe(true)
  })

  it('two fully open-ended sections always overlap', () => {
    expect(dateRangesOverlap(null, null, null, null)).toBe(true)
  })

  it('non-overlapping ranges in either order are not flagged', () => {
    expect(dateRangesOverlap('2026-01-01', '2026-01-31', '2026-03-01', '2026-03-31')).toBe(false)
    expect(dateRangesOverlap('2026-03-01', '2026-03-31', '2026-01-01', '2026-01-31')).toBe(false)
  })
})

describe('normalizeSectionName', () => {
  it('is case- and whitespace-insensitive so near-duplicate names still match', () => {
    expect(normalizeSectionName('  Вольная борьба ')).toBe(normalizeSectionName('вольная борьба'))
    expect(normalizeSectionName('Плавание')).not.toBe(normalizeSectionName('плавание '.trim() + 'x'))
  })
})
