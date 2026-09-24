'use client'

// Parent-side "where the money goes" panel for ONE child: period switch, tappable
// category bar → filtered ledger, section price changes ("Борьба 6 500 → 7 000
// с сентября") and one-tap small handouts (ice cream, sweets). Same maths as the
// kid banner (lib/spend/summary.ts) so both sides always show the same number.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { T } from '../tokens'
import { Card, Btn, Field } from '../ui'
import { SpendBar } from '@/components/spend/SpendBar'
import { deleteExpense } from '@/lib/expenses-api'
import { fetchChildSpend, changeSectionPrice, addHandout, type ChildSpendData } from '@/lib/spend/client'
import { buildSpend, describePriceChanges, priceFor, fmtRub, type SpendRange } from '@/lib/spend/summary'
import { localDateString } from '@/utils/helpers'

const COLORS = [T.indigo, T.success, T.warning, '#D9548A', '#3C86C6', T.faint]
const RANGES: Array<[SpendRange, string]> = [['week', 'Неделя'], ['month', 'Месяц'], ['all', 'Всего']]
const HANDOUTS = [50, 100, 150, 200]
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const monthName = (ym: string) => MONTHS[Number(ym.slice(5)) - 1] ?? ym
const monthGen = (ym: string) => MONTHS_GEN[Number(ym.slice(5)) - 1] ?? ym

function nextYM(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export default function ChildSpendBI({ childId, name, onChanged }: { childId: string; name: string; onChanged?: () => void }) {
  const [data, setData] = useState<ChildSpendData | null>(null)
  const [range, setRange] = useState<SpendRange>('month')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [custom, setCustom] = useState('')
  const [lastHandout, setLastHandout] = useState<{ id: string; amount: number } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [from, setFrom] = useState<'now' | 'next'>('now')
  const today = localDateString()
  const curYM = today.slice(0, 7)

  const load = useCallback(async () => {
    try { setData(await fetchChildSpend(childId)); setErr(null) }
    catch (e: any) { setErr(e?.message ?? 'Не удалось загрузить') }
  }, [childId])
  useEffect(() => { setData(null); setActiveCat(null); load() }, [load])

  const summary = useMemo(() => data ? buildSpend({ ...data, today, range }) : null, [data, today, range])
  const changes = useMemo(() => data ? describePriceChanges(data.priceChanges, data.sections) : [], [data])
  const items = (summary?.items ?? []).filter(i => !activeCat || i.categoryKey === activeCat)
  const paidSections = (data?.sections ?? []).filter(s => s.is_active && Number(s.cost) > 0)

  async function refresh() { await load(); onChanged?.() }

  async function handout(amount: number) {
    if (!(amount > 0) || busy) return
    setBusy(true); setErr(null)
    try {
      const r: any = await addHandout(childId, amount)
      setLastHandout({ id: r.id, amount }); setCustom(''); await refresh()
    } catch (e: any) { setErr(e?.message ?? 'Не удалось записать') }
    finally { setBusy(false) }
  }

  async function undoHandout() {
    if (!lastHandout) return
    try { await deleteExpense(lastHandout.id); setLastHandout(null); await refresh() }
    catch (e: any) { setErr(e?.message ?? 'Не удалось отменить') }
  }

  async function savePrice(sectionId: string) {
    const v = Number(price)
    if (!(v > 0)) { setErr('Введите цену больше нуля'); return }
    setBusy(true); setErr(null)
    try {
      await changeSectionPrice(sectionId, v, from === 'next' ? nextYM(curYM) : curYM)
      setEditing(null); await refresh()
    } catch (e: any) { setErr(e?.message ?? 'Не удалось изменить цену') }
    finally { setBusy(false) }
  }

  const chip: React.CSSProperties = {
    minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${T.cardBorder}`,
    background: T.cardHi, color: T.text, fontFamily: T.fMono, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {err && <Card pad={10} style={{ color: T.danger, fontSize: 13 }}>{err}</Card>}

      {/* Where the money goes */}
      <Card pad={14}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {RANGES.map(([r, label]) => (
            <Btn key={r} variant={range === r ? 'primary' : 'ghost'} size="sm" onClick={() => { setRange(r); setActiveCat(null) }}>{label}</Btn>
          ))}
        </div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>Потрачено на {name}</div>
        <div style={{ fontFamily: T.fMono, fontSize: 28, fontWeight: 700, color: T.text, margin: '2px 0 10px' }}>
          {summary ? `${summary.approximate ? '≈ ' : ''}${fmtRub(summary.total)}` : '…'}
        </div>
        {summary && (
          <>
            <SpendBar categories={summary.categories} colors={COLORS} height={14} trackColor={T.bg2}
              activeKey={activeCat} onSelect={k => setActiveCat(a => (a === k ? null : k))} />
            <div style={{ marginTop: 8 }}>
              {summary.categories.map((c, i) => (
                <button key={c.key} type="button" aria-pressed={activeCat === c.key}
                  onClick={() => setActiveCat(a => (a === c.key ? null : c.key))}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 40, padding: '4px 6px', margin: '0 -6px',
                    border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', font: 'inherit',
                    background: activeCat === c.key ? T.indigoSoft : 'transparent' }}>
                  <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: COLORS[i % COLORS.length] }} />
                  <span style={{ flex: 1, fontSize: 13, color: T.text }}>{c.icon} {c.name}</span>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: T.fMono }}>{Math.round(c.pct * 100)}%</span>
                  <span style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.text, minWidth: 80, textAlign: 'right' }}>{fmtRub(c.amount)}</span>
                </button>
              ))}
              {summary.categories.length === 0 && <div style={{ color: T.muted, fontSize: 13, padding: '6px 0' }}>За этот период расходов нет</div>}
            </div>
            {items.length > 0 && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${T.cardBorder}`, paddingTop: 4 }}>
                {items.slice(0, 30).map(it => (
                  <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, fontSize: 13, color: T.text }}>
                    <span aria-hidden>{it.icon}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                    <span style={{ fontSize: 11, color: T.muted }}>{it.sectionId ? monthName(it.date.slice(0, 7)) : it.date.slice(5).split('-').reverse().join('.')}</span>
                    <span style={{ fontFamily: T.fMono, fontWeight: 600, minWidth: 72, textAlign: 'right' }}>{it.prorated ? '≈ ' : ''}{fmtRub(it.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Small handouts */}
      <Card pad={14}>
        <div style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>Дал на мороженое, сладости, мелочи</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
          {HANDOUTS.map(a => (
            <button key={a} type="button" disabled={busy} onClick={() => handout(a)} style={chip}>+{a} ₽</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="Другая сумма" value={custom} onChange={v => setCustom(v.replace(/[^\d]/g, ''))} suffix="₽" mono />
          </div>
          <Btn variant="primary" size="md" onClick={() => handout(Number(custom))} disabled={busy || !(Number(custom) > 0)}>Записать</Btn>
        </div>
        {lastHandout && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 13, color: T.success }}>
            <span style={{ flex: 1 }}>Записано {fmtRub(lastHandout.amount)}</span>
            <Btn variant="ghost" size="sm" onClick={undoHandout}>Отменить</Btn>
          </div>
        )}
      </Card>

      {/* Section prices */}
      {paidSections.length > 0 && (
        <Card pad={14}>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 700, marginBottom: 6 }}>Цены секций</div>
          {paidSections.map(s => (
            <div key={s.id} style={{ borderTop: `1px solid ${T.cardBorder}`, padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 14, color: T.text, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontFamily: T.fMono, fontSize: 14, fontWeight: 700 }}>{fmtRub(priceFor(s, curYM, data?.priceChanges ?? []))}<span style={{ fontSize: 11, color: T.muted }}> / мес</span></span>
                <Btn variant="ghost" size="sm" onClick={() => { setEditing(editing === s.id ? null : s.id); setPrice(String(Number(s.cost))); setFrom('now') }}>Изменить</Btn>
              </div>
              {editing === s.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  <Field label="Новая цена в месяц" value={price} onChange={v => setPrice(v.replace(/[^\d]/g, ''))} suffix="₽" mono />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Btn variant={from === 'now' ? 'primary' : 'ghost'} size="sm" onClick={() => setFrom('now')}>С этого месяца ({monthName(curYM)})</Btn>
                    <Btn variant={from === 'next' ? 'primary' : 'ghost'} size="sm" onClick={() => setFrom('next')}>Со следующего ({monthName(nextYM(curYM))})</Btn>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>Прошлые месяцы останутся по старой цене.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="ghost" size="md" full onClick={() => setEditing(null)} disabled={busy}>Отмена</Btn>
                    <Btn variant="primary" size="md" full onClick={() => savePrice(s.id)} disabled={busy}>Сохранить цену</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
          {changes.slice(0, 4).map(c => (
            <div key={`${c.sectionId}:${c.period}`} style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
              {c.name}: {c.from != null ? `${fmtRub(c.from)} → ` : ''}{fmtRub(c.to)} с {monthGen(c.period)}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
