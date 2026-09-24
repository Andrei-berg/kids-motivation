'use client'

// "На тебя потрачено" — tappable banner on the kid Day screen + detail sheet.
// Shows what the family puts into THIS child (sections, tutors, pocket money…)
// so the total is never a mystery. Rubles are sky-blue on purpose: mango is
// reserved for coins, and the two must never read as the same currency.

import { useEffect, useMemo, useState } from 'react'
import { K } from '@/components/kid/design/kidTheme'
import BottomSheet from '@/components/kid/day-fill/BottomSheet'
import { SpendBar } from '@/components/spend/SpendBar'
import { useT } from '@/lib/i18n'
import { localDateString } from '@/utils/helpers'
import { fetchChildSpend, type ChildSpendData } from '@/lib/spend/client'
import { buildSpend, describePriceChanges, fmtRub, type SpendRange } from '@/lib/spend/summary'

const SEG_COLORS = [K.sky, K.grape, K.mint, K.berry, K.ink3]
const RANGES: SpendRange[] = ['week', 'month', 'all']
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
function periodLabel(ym: string) {
  return MONTHS_RU[Number(ym.slice(5)) - 1] ?? ym
}
function monthNom(ym: string) {
  return MONTHS_NOM[Number(ym.slice(5)) - 1] ?? ym
}
function shortDate(d: string) {
  return `${Number(d.slice(8))} ${MONTHS_RU[Number(d.slice(5, 7)) - 1]}`
}

export default function KidSpendBanner({ childId }: { childId: string }) {
  const t = useT()
  const [data, setData] = useState<ChildSpendData | null>(null)
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<SpendRange>('month')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const today = localDateString()

  useEffect(() => {
    let alive = true
    fetchChildSpend(childId).then(d => { if (alive) setData(d) }).catch(() => {})
    return () => { alive = false }
  }, [childId])

  const month = useMemo(
    () => data ? buildSpend({ ...data, today, range: 'month' }) : null,
    [data, today],
  )
  const detail = useMemo(
    () => data ? buildSpend({ ...data, today, range }) : null,
    [data, today, range],
  )
  const changes = useMemo(
    () => data ? describePriceChanges(data.priceChanges, data.sections) : [],
    [data],
  )

  // Nothing spent and nothing planned → don't show an empty money card.
  if (!data || !month || (month.total <= 0 && data.expenses.length === 0)) return null

  const visibleItems = (detail?.items ?? []).filter(i => !activeCat || i.categoryKey === activeCat)

  return (
    <>
      <button
        type="button"
        aria-label={t('kidSpend.openLabel')}
        onClick={() => { setRange('month'); setActiveCat(null); setOpen(true) }}
        style={{
          display: 'block', width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer',
          background: K.card, border: `1.5px solid ${K.line}`, borderRadius: 18,
          padding: '12px 14px', boxShadow: `0 3px 0 ${K.line}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink2 }}>
            {t('kidSpend.monthLabel')}
          </span>
          <span style={{ fontFamily: K.fBody, fontSize: 12, fontWeight: 700, color: K.sky }}>
            {t('kidSpend.details')} ›
          </span>
        </div>
        <div style={{ fontFamily: K.fNum, fontSize: 30, fontWeight: 900, color: K.skyDeep, lineHeight: 1.15, margin: '2px 0 10px' }}>
          {fmtRub(month.total)}
        </div>
        <SpendBar categories={month.categories} colors={SEG_COLORS} trackColor={K.lineSoft} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
          {month.categories.slice(0, 4).map((c, i) => (
            <span key={c.key} style={{ fontFamily: K.fBody, fontSize: 12, fontWeight: 700, color: K.ink2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: SEG_COLORS[i % SEG_COLORS.length] }} />
              {c.icon} {fmtRub(c.amount)}
            </span>
          ))}
        </div>
      </button>

      <BottomSheet
        open={open} title={t('kidSpend.title')} icon="🎒"
        onClose={() => setOpen(false)} closeLabel={t('kidFillForm.sheetClose')}
      >
        <div role="tablist" style={{ display: 'flex', gap: 6, background: K.lineSoft, padding: 4, borderRadius: 14, marginBottom: 14 }}>
          {RANGES.map(r => (
            <button key={r} type="button" role="tab" aria-selected={range === r}
              onClick={() => { setRange(r); setActiveCat(null) }}
              style={{
                flex: 1, minHeight: 40, border: 'none', borderRadius: 11, cursor: 'pointer',
                fontFamily: K.fDisp, fontSize: 14, fontWeight: 800,
                background: range === r ? K.card : 'transparent',
                color: range === r ? K.skyDeep : K.ink3,
                boxShadow: range === r ? `0 1px 0 ${K.line}` : 'none',
              }}>
              {t(`kidSpend.range.${r}`)}
            </button>
          ))}
        </div>

        {detail && (
          <>
            <div style={{ fontFamily: K.fNum, fontSize: 36, fontWeight: 900, color: K.skyDeep, lineHeight: 1.1 }}>
              {detail.approximate ? '≈ ' : ''}{fmtRub(detail.total)}
            </div>
            {detail.approximate && (
              <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.ink3, fontWeight: 600, marginTop: 2 }}>
                {t('kidSpend.approxNote')}
              </div>
            )}
            <div style={{ margin: '12px 0 8px' }}>
              <SpendBar categories={detail.categories} colors={SEG_COLORS} height={16} trackColor={K.lineSoft}
                activeKey={activeCat} onSelect={k => setActiveCat(a => (a === k ? null : k))} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {detail.categories.map((c, i) => {
                const on = activeCat === c.key
                return (
                  <button key={c.key} type="button" onClick={() => setActiveCat(a => (a === c.key ? null : c.key))}
                    aria-pressed={on}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '6px 8px',
                      margin: '0 -8px', border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      background: on ? K.skySoft : 'transparent', font: 'inherit',
                    }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: SEG_COLORS[i % SEG_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: K.fBody, fontSize: 15, fontWeight: 700, color: K.ink }}>{c.icon} {c.name}</span>
                    <span style={{ fontFamily: K.fBody, fontSize: 12, fontWeight: 700, color: K.ink3 }}>{Math.round(c.pct * 100)}%</span>
                    <span style={{ fontFamily: K.fNum, fontSize: 15, fontWeight: 800, color: K.ink, minWidth: 74, textAlign: 'right' }}>{fmtRub(c.amount)}</span>
                  </button>
                )
              })}
              {detail.categories.length === 0 && (
                <div style={{ fontFamily: K.fBody, fontSize: 14, color: K.ink3, padding: '10px 0' }}>{t('kidSpend.empty')}</div>
              )}
            </div>

            {visibleItems.length > 0 && (
              <div style={{ marginTop: 14, borderTop: `1.5px solid ${K.lineSoft}`, paddingTop: 6 }}>
                {visibleItems.slice(0, 40).map(it => (
                  <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, borderBottom: `1px solid ${K.lineSoft}` }}>
                    <span aria-hidden style={{ fontSize: 18 }}>{it.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: K.fBody, fontSize: 14, fontWeight: 700, color: K.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                      <div style={{ fontFamily: K.fBody, fontSize: 11, fontWeight: 600, color: K.ink3 }}>
                        {it.sectionId ? `${t('kidSpend.perMonth')} · ${monthNom(it.date.slice(0, 7))}` : shortDate(it.date)}
                      </div>
                    </div>
                    <span style={{ fontFamily: K.fNum, fontSize: 14, fontWeight: 800, color: K.ink }}>
                      {it.prorated ? '≈ ' : ''}{fmtRub(it.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {changes.length > 0 && (
              <div style={{ marginTop: 14, background: K.skySoft, borderRadius: 14, padding: '10px 12px' }}>
                {changes.slice(0, 3).map(c => (
                  <div key={`${c.sectionId}:${c.period}`} style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink }}>
                    {c.name}: {c.from != null ? `${fmtRub(c.from)} → ` : ''}{fmtRub(c.to)} {t('kidSpend.since')} {periodLabel(c.period)}
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 600, color: K.ink2, margin: '14px 0 0', lineHeight: 1.45 }}>
              {t('kidSpend.footer')}
            </p>
          </>
        )}
      </BottomSheet>
    </>
  )
}
