'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'
import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Tabs } from '../ui'
import { Amount, StatusChip } from '@/components/design/atoms'
import { completionTone } from '@/lib/weekly-summary'
import type { ParentChild, ActivityEntry } from '../types'
import { CHILD_ACCENTS } from '../tokens'
import type { FamilyStats, ChildStats } from '@/lib/stats/family-stats'

const fmt = (n: number) => n.toLocaleString('ru-RU')
const one = (n: number | null) => (n === null ? '–' : n.toFixed(1).replace('.', ','))
const RU_DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const dayLabel = (d: string) => RU_DOW[(new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7]
const shortDate = (d: string) => `${Number(d.slice(8))}.${d.slice(5, 7)}`

type Bucket = { label: string; title: string; vals: number[] }

// Coins earned per child. ≤14 days: one bar per day; longer: one bar per week.
function bucketCoins(kids: ChildStats[], range: number): Bucket[] {
  if (!kids.length) return []
  if (range <= 14) {
    return kids[0].days.map((d, i) => ({ label: dayLabel(d.date), title: shortDate(d.date), vals: kids.map(k => k.days[i].coinsIn) }))
  }
  return kids[0].weeks.map(w => ({
    label: shortDate(w.start), title: `неделя с ${shortDate(w.start)}`,
    vals: kids.map(k => k.weeks.find(x => x.start === w.start)?.coins ?? 0),
  }))
}

function CoinBars({ buckets, colors, names, h = 150 }: { buckets: Bucket[]; colors: string[]; names: string[]; h?: number }) {
  const max = Math.max(1, ...buckets.flatMap(b => b.vals))
  const dense = buckets.length > 10
  return (
    <div role="img" aria-label="Монеты по дням" style={{ display: 'flex', alignItems: 'flex-end', gap: dense ? 4 : 8, height: h + 22 }}>
      {buckets.map((b, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: h, width: '100%' }}>
            {b.vals.map((v, j) => (
              <div key={j} title={`${names[j]} · ${b.title}: ${fmt(v)}`} style={{
                flex: 1, height: v ? Math.max(3, (v / max) * h) : 2, background: v ? colors[j] : T.cardBorder,
                borderRadius: '4px 4px 1px 1px',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: T.fMono, whiteSpace: 'nowrap' }}>{dense && i % 2 ? '' : b.label}</span>
        </div>
      ))}
    </div>
  )
}

// Average grade per calendar week. Fixed 2–5 axis so a 4,6 and a 3,2 never look alike;
// weeks with no grades are gaps, not zeros.
function GradeLines({ kids, colors }: { kids: ChildStats[]; colors: string[] }) {
  const weeks = kids[0]?.weeks ?? []
  if (weeks.length < 2 || kids.every(k => k.weeks.every(w => w.avg === null))) {
    return <div style={{ fontSize: 13, color: T.muted, padding: '24px 0', textAlign: 'center' }}>Оценок за этот период пока нет</div>
  }
  const w = 320, h = 170, padL = 26, padR = 10, padT = 10, padB = 22
  const iw = w - padL - padR, ih = h - padT - padB
  const x = (i: number) => padL + (iw / (weeks.length - 1)) * i
  const y = (v: number) => padT + ih - ((Math.min(5, Math.max(2, v)) - 2) / 3) * ih
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Средняя оценка по неделям">
      {[2, 3, 4, 5].map(g => (
        <g key={g}>
          <line x1={padL} x2={w - padR} y1={y(g)} y2={y(g)} stroke={T.cardBorder} strokeWidth="1" />
          <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill={T.muted} fontFamily={T.fMono}>{g}</text>
        </g>
      ))}
      {weeks.map((wk, i) => (i % Math.ceil(weeks.length / 6) === 0) && (
        <text key={wk.start} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill={T.muted} fontFamily={T.fMono}>{shortDate(wk.start)}</text>
      ))}
      {kids.map((k, ki) => {
        const segs: string[] = []; let cur = ''
        k.weeks.forEach((wk, i) => {
          if (wk.avg === null) { if (cur) segs.push(cur); cur = ''; return }
          cur += (cur ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(wk.avg).toFixed(1)
        })
        if (cur) segs.push(cur)
        return (
          <g key={k.childId}>
            {segs.map((d, i) => <path key={i} d={d} fill="none" stroke={colors[ki]} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />)}
            {k.weeks.map((wk, i) => wk.avg === null ? null : (
              <circle key={i} cx={x(i)} cy={y(wk.avg)} r="3.4" fill={T.bg1} stroke={colors[ki]} strokeWidth="2">
                <title>{`${k.name} · неделя с ${shortDate(wk.start)}: ${one(wk.avg)} (${wk.count} оц.)`}</title>
              </circle>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// One square per day: green = room + behaviour done, amber = filled but not fully, hollow = nothing filled.
function DayHeat({ k }: { k: ChildStats }) {
  const n = k.days.length
  const size = n <= 7 ? 32 : n <= 30 ? 16 : 9
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: n <= 7 ? 6 : 3 }} role="img" aria-label={`Дни ${k.name}`}>
      {k.days.map(d => {
        const clean = d.filled && d.roomOk && d.goodBehavior
        const g = d.grades.length ? d.grades.reduce((a, b) => a + b, 0) / d.grades.length : null
        return (
          <div key={d.date} title={`${shortDate(d.date)}${g ? ` · оценка ${one(g)}` : ''}${d.filled ? '' : ' · не заполнен'}`} style={{
            width: size, height: size, borderRadius: size > 12 ? 6 : 3, display: 'grid', placeItems: 'center',
            background: clean ? T.success : d.filled ? T.warning : 'transparent',
            border: d.filled ? 'none' : `1.5px dashed ${T.cardBorderHi}`,
            color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.fMono,
          }}>{n <= 7 && g !== null ? Math.round(g * 10) / 10 : ''}</div>
        )
      })}
    </div>
  )
}

const gradeTone = (g: number | null) => g === null ? T.muted : g >= 4.5 ? T.success : g >= 3.5 ? T.text : g >= 3 ? T.warning : T.danger

function ChildPanel({ k, color, range }: { k: ChildStats; color: string; range: number }) {
  const t = k.totals
  const cleanPct = t.filledDays ? Math.round((t.cleanDays / t.filledDays) * 100) : null
  return (
    <Card pad={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
        <div style={{ fontFamily: T.fHead, fontSize: 18, fontWeight: 700, color: T.text, flex: 1 }}>{k.name}</div>
        <div style={{ fontFamily: T.fMono, fontSize: 12, color: T.muted }}>серия {k.streak.current} · рекорд {k.streak.best}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <Stat label="Средняя оценка" value={one(t.gradeAvg)} sub={`${t.gradeCount} оц.`} tone={gradeTone(t.gradeAvg)} />
        <Stat label="Монет получено" value={fmt(t.earned)} sub={t.spent ? `потрачено ${fmt(t.spent)}` : 'не тратил'} />
        <Stat label="Чистые дни" value={cleanPct === null ? '–' : cleanPct + '%'} sub={`${t.cleanDays} из ${t.filledDays} заполненных`} tone={cleanPct === null ? T.muted : T[completionTone(cleanPct)]} />
      </div>
      <DayHeat k={k} />
      <div style={{ marginTop: 16 }}>
        {k.subjects.slice(0, range === 7 ? 5 : 8).map((s, i) => (
          <div key={s.subject} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 22px', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: i ? `1px solid ${T.cardBorder}` : 'none' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject}</div>
              <div style={{ height: 5, borderRadius: 3, background: T.bg2, marginTop: 4 }}>
                <div style={{ width: `${(s.avg / 5) * 100}%`, height: '100%', borderRadius: 3, background: gradeTone(s.avg) === T.text ? color : gradeTone(s.avg) }} />
              </div>
            </div>
            <div style={{ fontFamily: T.fMono, fontWeight: 700, fontSize: 14, color: gradeTone(s.avg), textAlign: 'right' }}>{one(s.avg)}</div>
            <div style={{ fontSize: 13, color: s.trend === null || Math.abs(s.trend) < 0.2 ? T.faint : s.trend > 0 ? T.success : T.danger }} title={s.trend === null ? 'мало данных для динамики' : `динамика ${s.trend > 0 ? '+' : ''}${one(s.trend)}`}>
              {s.trend === null || Math.abs(s.trend) < 0.2 ? '·' : s.trend > 0 ? '↑' : '↓'}
            </div>
          </div>
        ))}
        {!k.subjects.length && <div style={{ fontSize: 13, color: T.muted }}>Оценок за этот период нет</div>}
      </div>
    </Card>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: T.fMono, fontSize: 24, fontWeight: 700, color: tone ?? T.text, letterSpacing: '-0.02em', marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>
    </div>
  )
}

// D-08: the one truly-real content block on this screen — coins/tasks/streak
// computed in ParentCenter.tsx's loadAll() from correct sources (wallet_transactions
// via sumWeeklyCoins, NOT getWeekScore.total) and passed down as props.
function WeeklySummaryCard({ coinsThisWeek, taskRate, streakHighlight, weeklyError }: {
  coinsThisWeek: number
  taskRate: number
  streakHighlight: { name: string; days: number } | null
  weeklyError?: boolean
}) {
  const t = useT()

  if (weeklyError) {
    return (
      <Card pad={16}>
        <div style={{
          fontSize: 13, color: T.danger, background: T.dangerSoft,
          borderRadius: 10, padding: '10px 12px',
        }}>
          {t('analytics.weeklySummary.loadError')}
        </div>
      </Card>
    )
  }

  const isEmpty = coinsThisWeek === 0 && taskRate === 0

  return (
    <Card pad={16}>
      <div style={{ fontFamily: T.fHead, fontSize: 17, fontWeight: 700, color: T.text, marginBottom: isEmpty ? 0 : 14 }}>
        {t('analytics.weeklySummary.title')}
      </div>
      {isEmpty ? (
        <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '12px 0' }}>
          {t('analytics.weeklySummary.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: '1 1 0', minWidth: 100 }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('analytics.weeklySummary.coinsEarned')}
            </div>
            <div style={{ marginTop: 4 }}>
              <Amount value={coinsThisWeek} theme="ink" money={true} size="lg"/>
            </div>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 100 }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('analytics.weeklySummary.tasksDone')}
            </div>
            <div style={{ marginTop: 4 }}>
              <StatusChip theme="ink" tone={completionTone(taskRate)}>{taskRate}%</StatusChip>
            </div>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 100 }}>
            {streakHighlight ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: T.warning, marginTop: 4 }}>
                {t('analytics.weeklySummary.streakHighlight', { name: streakHighlight.name, days: String(streakHighlight.days) })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
                {t('analytics.weeklySummary.noStreak')}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function useDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isDesktop
}

export default function AnalyticsScreen({ children, coinsThisWeek, taskRate: weeklyTaskRate, streakHighlight, weeklyError }: {
  children: ParentChild[]
  activity: ActivityEntry[]
  coinsThisWeek: number
  taskRate: number
  streakHighlight: { name: string; days: number } | null
  weeklyError?: boolean
}) {
  const t = useT()
  const [range, setRange] = useState<7 | 30 | 90>(7)
  const [data, setData] = useState<FamilyStats | null>(null)
  const [err, setErr] = useState(false)
  const [tick, setTick] = useState(0)
  const isDesktop = useDesktop()

  useEffect(() => {
    let live = true
    setErr(false)
    fetch(`/api/stats?range=${range}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => { if (live) setData(j) })
      .catch(() => { if (live) setErr(true) })
    return () => { live = false }
  }, [range, tick])

  const kids = data?.range === range ? data.children : []
  const accentOf = (id: string, i: number) => children.find(c => c.id === id)?.accent ?? CHILD_ACCENTS[i % CHILD_ACCENTS.length]
  const colors = kids.map((k, i) => accentOf(k.childId, i))
  const totalEarned = kids.reduce((a, k) => a + k.totals.earned, 0)
  const totalSpent = kids.reduce((a, k) => a + k.totals.spent, 0)
  const cnt = kids.reduce((a, k) => a + k.totals.gradeCount, 0)
  const famAvg = cnt ? kids.reduce((a, k) => a + (k.totals.gradeAvg ?? 0) * k.totals.gradeCount, 0) / cnt : null
  const filled = kids.reduce((a, k) => a + k.totals.filledDays, 0)
  const clean = kids.reduce((a, k) => a + k.totals.cleanDays, 0)

  const kpis = [
    { l: 'Средняя оценка', v: one(famAvg), s: `${cnt} оценок` },
    { l: 'Монет получено', v: fmt(totalEarned), s: 'по журналу кошелька' },
    { l: 'Потрачено', v: fmt(totalSpent), s: 'магазин и обмены' },
    { l: 'Чистые дни', v: filled ? Math.round((clean / filled) * 100) + '%' : '–', s: 'комната и поведение' },
  ]
  const rangeLabel = range === 7 ? 'последние 7 дней' : range === 30 ? 'последние 30 дней' : 'последние 90 дней'

  return (
    <div style={{ padding: isDesktop ? '24px' : '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>{t('analytics.screen.title')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Успеваемость, режим и монеты: {rangeLabel}</p>
      </div>

      <Tabs value={String(range)} onChange={v => setRange(Number(v) as 7 | 30 | 90)} tabs={[
        { id: '7', label: t('analytics.screen.tabWeek') },
        { id: '30', label: t('analytics.screen.tabMonth') },
        { id: '90', label: t('analytics.screen.tabQuarter') },
      ]}/>

      <WeeklySummaryCard
        coinsThisWeek={coinsThisWeek} taskRate={weeklyTaskRate}
        streakHighlight={streakHighlight} weeklyError={weeklyError}
      />

      {err && (
        <Card pad={16}>
          <div style={{ fontSize: 13, color: T.danger, marginBottom: 10 }}>Не удалось загрузить статистику.</div>
          <Btn variant="ghost" size="sm" onClick={() => setTick(n => n + 1)}>Повторить</Btn>
        </Card>
      )}
      {!err && !data && <div style={{ fontSize: 13, color: T.muted }}>Загружаем…</div>}
      {!err && data && data.range !== range && <div style={{ fontSize: 13, color: T.muted }}>Обновляем…</div>}

      {kids.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 10 }}>
            {kpis.map(k => (
              <Card key={k.l} pad={12}>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{k.l}</div>
                <div style={{ fontFamily: T.fMono, fontSize: 22, fontWeight: 700, color: T.text, marginTop: 4, letterSpacing: '-0.02em' }}>{k.v}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{k.s}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 16 }}>
            <Card pad={16}>
              <ChartHead title="Монеты" sub={range <= 14 ? 'по дням' : 'по неделям'} kids={kids} colors={colors} />
              <CoinBars buckets={bucketCoins(kids, range)} colors={colors} names={kids.map(k => k.name)} />
            </Card>
            <Card pad={16}>
              <ChartHead title="Средняя оценка" sub="по неделям" kids={kids} colors={colors} />
              <GradeLines kids={kids} colors={colors} />
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop && kids.length > 1 ? '1fr 1fr' : '1fr', gap: 16 }}>
            {kids.map((k, i) => <ChildPanel key={k.childId} k={k} color={colors[i]} range={range} />)}
          </div>
        </>
      )}
      {!err && data && data.range === range && kids.length === 0 && (
        <Card pad={16}><div style={{ fontSize: 13, color: T.muted }}>Добавьте детей, и здесь появится статистика.</div></Card>
      )}
    </div>
  )
}

function ChartHead({ title, sub, kids, colors }: { title: string; sub: string; kids: ChildStats[]; colors: string[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {kids.map((k, i) => (
          <span key={k.childId} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.textDim }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: colors[i], display: 'block' }} />{k.name}
          </span>
        ))}
      </div>
    </div>
  )
}
