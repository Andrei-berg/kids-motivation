'use client'

// Family board for a TV (Google TV Streamer, viewed from ~3 m). No interaction: it
// pairs once with a code, then polls /api/tv/data and shows each child's week.
// Deliberately its own dark palette — a lit-up living room in the evening, not
// the paper/daylight themes of the phone UI.

import { useEffect, useRef, useState } from 'react'
import type { ChildStats, FamilyStats, DayStat } from '@/lib/stats/family-stats'
import type { TvExtras, TvTraining } from '@/lib/stats/tv-extras'

const C = {
  bg: '#14112A', panel: '#1E1A3B', line: 'rgba(246,241,231,0.10)',
  ink: '#F6F1E7', dim: 'rgba(246,241,231,0.62)', faint: 'rgba(246,241,231,0.34)',
  gold: '#F2B84B', good: '#4FD1A1', ok: '#F2B84B', bad: '#FF7A88',
}
const ACCENTS = ['#8F82FF', '#4FD1A1', '#FF8FBF', '#6DB6F5', '#D093E8']
const DISPLAY = "var(--font-kid-display), 'Rubik', system-ui, sans-serif"
const BODY = "var(--font-kid-body), 'Nunito', system-ui, sans-serif"
const LS = 'tv_secret_v1'
const POLL_MS = 60_000

const gradeColor = (g: number | null) => g === null ? C.faint : g >= 4.5 ? C.good : g >= 3.8 ? '#A5DE7A' : g >= 3 ? C.ok : C.bad
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const dow = (date: string) => DOW[(new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7]
const fmt = (n: number) => n.toLocaleString('ru-RU')
const dayAvg = (d: DayStat) => d.grades.length ? d.grades.reduce((a, b) => a + b, 0) / d.grades.length : null

type Phase = { k: 'boot' } | { k: 'pair'; code: string } | { k: 'board'; data: TvData } | { k: 'offline'; data: TvData | null }

export default function TvPage() {
  const [phase, setPhase] = useState<Phase>({ k: 'boot' })
  const secret = useRef<string | null>(null)
  const last = useRef<TvData | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const wait = (ms: number, fn: () => void) => { timer = setTimeout(() => alive && fn(), ms) }

    async function startPairing() {
      try {
        const r = await fetch('/api/tv/pair', { method: 'POST' })
        const j = await r.json()
        secret.current = j.secret; localStorage.setItem(LS, j.secret)
        setPhase({ k: 'pair', code: j.code })
        // poll for claim; code lives 15 min, then request a fresh one
        const until = Date.now() + (j.expiresInSec - 10) * 1000
        const poll = async () => {
          const s = await fetch('/api/tv/pair', { headers: { 'x-tv-secret': j.secret } }).then(x => x.json()).catch(() => null)
          if (s?.status === 'active') return load()
          if (Date.now() > until) return startPairing()
          wait(3000, poll)
        }
        wait(3000, poll)
      } catch { wait(5000, startPairing) }
    }

    async function load() {
      try {
        const r = await fetch('/api/tv/data', { headers: { 'x-tv-secret': secret.current! }, cache: 'no-store' })
        if (r.status === 401) { localStorage.removeItem(LS); secret.current = null; return startPairing() }
        if (!r.ok) throw new Error()
        last.current = await r.json()
        setPhase({ k: 'board', data: last.current! })
      } catch { setPhase({ k: 'offline', data: last.current }) }
      wait(POLL_MS, load)
    }

    try { secret.current = localStorage.getItem(LS) } catch { /* private mode */ }
    secret.current ? load() : startPairing()
    return () => { alive = false; clearTimeout(timer) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.ink, fontFamily: BODY, overflow: 'hidden', cursor: 'none' }}>
      {phase.k === 'pair' && <Pairing code={phase.code} />}
      {phase.k === 'board' && <Board data={phase.data} />}
      {phase.k === 'offline' && (phase.data ? <Board data={phase.data} stale /> : <Center text="Нет связи. Пробуем снова…" />)}
      {phase.k === 'boot' && <Center text="" />}
    </div>
  )
}

function Center({ text }: { text: string }) {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: '2.4vw', color: C.dim }}>{text}</div>
}

function Pairing({ code }: { code: string }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: '6vh 6vw' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontSize: '3.2vw', fontWeight: 600 }}>Подключите телевизор к семье</div>
        <div style={{ display: 'flex', gap: '1.2vw', justifyContent: 'center', margin: '5vh 0' }}>
          {code.split('').map((d, i) => (
            <div key={i} style={{
              width: '9vw', height: '13vw', display: 'grid', placeItems: 'center', background: C.panel,
              borderRadius: '1.2vw', fontFamily: DISPLAY, fontWeight: 700, fontSize: '8vw', color: C.gold,
              marginLeft: i === 3 ? '1.6vw' : 0,
            }}>{d}</div>
          ))}
        </div>
        <div style={{ fontSize: '2vw', color: C.dim, lineHeight: 1.5, maxWidth: '60vw', margin: '0 auto' }}>
          На телефоне откройте Parent Center → Настройки → «Телевизор» и введите этот код. Код действует 15 минут.
        </div>
      </div>
    </div>
  )
}

type TvData = FamilyStats & { tv?: TvExtras | null }
const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`
const g1 = (n: number) => n.toFixed(1).replace('.', ',')

function Board({ data, stale }: { data: TvData; stale?: boolean }) {
  const kids = data.children
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])

  if (!kids.length) return <Center text="Добавьте детей в Parent Center, и здесь появится табло" />
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto auto', padding: '3vh 3vw', gap: '2vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: DISPLAY, fontSize: '2.2vw', fontWeight: 600 }}>
          {now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ fontSize: '1.6vw', color: stale ? C.bad : C.dim }}>
          {stale ? 'Нет связи, показаны последние данные' : now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kids.length, 4)}, 1fr)`, gap: '1.4vw', minHeight: 0 }}>
        {kids.slice(0, 4).map((k, i) => (
          <Lane key={k.childId} k={k} accent={ACCENTS[i % ACCENTS.length]}
            trainings={(data.tv?.trainings ?? []).filter(t => t.childId === k.childId)} />
        ))}
      </main>
      <SpendBand data={data} />
      <Ticker data={data} />
    </div>
  )
}

// A week average under 4 turns the lane's frame and the grade itself coral, and the
// "подтянуть" list says which subjects to work on. Above 4 it says keep going.
const LOW = 4

function Lane({ k, accent, trainings }: { k: ChildStats; accent: string; trainings: TvTraining[] }) {
  const week = k.days.slice(-7)
  const prev = k.days.slice(-14, -7)
  const weekGrades = week.flatMap(d => d.grades)
  const weekAvg = weekGrades.length ? weekGrades.reduce((a, b) => a + b, 0) / weekGrades.length : null
  const coins = week.reduce((a, d) => a + d.coinsIn, 0)
  const prevCoins = prev.reduce((a, d) => a + d.coinsIn, 0)
  const trend = k.weeks.filter(w => w.avg !== null).slice(-5)
  const today = week[week.length - 1]
  const low = weekAvg !== null && weekAvg < LOW
  const weak = k.subjects.filter(s => s.avg < LOW).sort((a, b) => a.avg - b.avg).slice(0, 3)
  const doneToday = today?.filled

  return (
    <section style={{
      background: C.panel, borderRadius: '1.6vw', padding: '2vh 1.6vw', display: 'flex', flexDirection: 'column', gap: '1.8vh', minWidth: 0,
      borderTop: `0.5vh solid ${accent}`, boxShadow: low ? `inset 0 0 0 0.25vw ${C.bad}66` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
        <div style={{ width: '4vw', height: '4vw', borderRadius: '50%', background: accent + '33', display: 'grid', placeItems: 'center', fontSize: '2.3vw', overflow: 'hidden', flex: 'none' }}>
          {k.avatarUrl ? <img src={k.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : k.emoji}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: '2.6vw', fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.9vw', color: k.streak.current ? C.gold : C.faint }}>
          {k.streak.current ? `🔥 ${k.streak.current}` : '–'}
        </div>
      </div>

      {/* Coins first: the number they actually play for */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1vw' }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '6vw', lineHeight: 1, color: C.gold }}>{fmt(k.balance)}</span>
          <span style={{ fontSize: '1.6vw', color: C.dim }}>монет</span>
        </div>
        <div style={{ fontSize: '1.5vw', marginTop: '0.4vh', color: coins >= prevCoins ? C.good : C.dim }}>
          +{fmt(coins)} за неделю{prevCoins ? <span style={{ color: C.faint }}>, неделей раньше +{fmt(prevCoins)}</span> : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2vw' }}>
        <div>
          <div style={{ fontSize: '1.2vw', color: C.dim }}>Средняя оценка за неделю</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '4vw', lineHeight: 1.05, color: gradeColor(weekAvg) }}>
            {weekAvg === null ? '–' : g1(weekAvg)}
          </div>
        </div>
        <Spark pts={trend.map(w => w.avg as number)} color={gradeColor(weekAvg)} />
        {low && <div style={{ marginLeft: 'auto', background: C.bad, color: '#14112A', fontWeight: 800, fontSize: '1.3vw', padding: '0.6vh 0.9vw', borderRadius: 99 }}>ниже 4</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4vw' }}>
        {week.map(d => <DayCell key={d.date} d={d} isToday={d.date === today?.date} />)}
      </div>

      {/* Today */}
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: '1.4vh', fontSize: '1.45vw', display: 'flex', flexDirection: 'column', gap: '0.7vh' }}>
        <div style={{ display: 'flex', gap: '1.2vw', color: C.dim }}>
          <span style={{ color: doneToday ? C.good : C.gold }}>{doneToday ? '✓ день заполнен' : '○ день ещё не заполнен'}</span>
          {doneToday && <span style={{ color: today.roomOk ? C.good : C.faint }}>{today.roomOk ? '✓ комната' : '– комната'}</span>}
        </div>
        {trainings.length
          ? trainings.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.9vw', alignItems: 'baseline' }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: accent, minWidth: '4.6vw' }}>{t.start ?? 'сегодня'}</span>
                <span style={{ color: C.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              </div>
            ))
          : <div style={{ color: C.faint }}>Сегодня без тренировок</div>}
      </div>

      {/* Where to catch up */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderTop: `1px solid ${C.line}`, paddingTop: '1.4vh' }}>
        {weak.length ? (
          <>
            <div style={{ fontSize: '1.25vw', color: C.bad, marginBottom: '0.8vh' }}>Подтянуть до 4</div>
            {weak.map(s => (
              <div key={s.subject} style={{ display: 'flex', justifyContent: 'space-between', gap: '1vw', fontSize: '1.6vw', marginBottom: '0.5vh' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject}</span>
                <span style={{ flex: 'none', fontFamily: DISPLAY, fontWeight: 700, color: C.bad }}>
                  {g1(s.avg)}{s.trend !== null && Math.abs(s.trend) >= 0.2 ? (s.trend > 0 ? ' ↑' : ' ↓') : ''}
                </span>
              </div>
            ))}
          </>
        ) : k.subjects.length ? (
          <div style={{ fontSize: '1.5vw', color: C.good }}>Все предметы не ниже 4. Так держать</div>
        ) : (
          <div style={{ fontSize: '1.4vw', color: C.faint }}>Оценок за 4 недели пока нет</div>
        )}
      </div>
    </section>
  )
}

// What the family put into each child this month; rubles are blue-grey, never
// gold, so money and coins can't be mistaken for each other on the wall.
function SpendBand({ data }: { data: TvData }) {
  const rows = (data.tv?.spend ?? []).filter(s => s.total > 0)
  if (!rows.length) return null
  const shades = ['#6DB6F5', '#8FA8E8', '#5FA0C8', '#7A8FB8']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rows.length, 4)}, 1fr)`, gap: '1.4vw' }}>
      {rows.slice(0, 4).map(s => {
        const name = data.children.find(c => c.childId === s.childId)?.name ?? ''
        return (
          <div key={s.childId} style={{ background: C.panel, borderRadius: '1.1vw', padding: '1.2vh 1.4vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1vw' }}>
              <span style={{ fontSize: '1.35vw', color: C.dim }}>На {name} в этом месяце</span>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '2.2vw', color: '#6DB6F5' }}>{rub(s.total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 3, height: '1vh', margin: '0.8vh 0', borderRadius: 99, overflow: 'hidden', background: C.line }}>
              {s.categories.map((c, i) => <div key={c.key} style={{ flex: `${Math.max(c.amount, 1)} 1 0`, background: shades[i % shades.length] }} />)}
            </div>
            <div style={{ display: 'flex', gap: '1.2vw', fontSize: '1.15vw', color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {s.categories.slice(0, 3).map(c => <span key={c.key}>{c.icon ?? ''} {c.name} {rub(c.amount)}</span>)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Key({ c, t }: { c: string; t: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35vw' }}><i style={{ width: '0.8vw', height: '0.8vw', borderRadius: 3, background: c, display: 'block' }} />{t}</span>
}

function Stat({ big, label, tone }: { big: string; label: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '2.1vw', color: tone ?? C.ink }}>{big}</div>
      <div style={{ fontSize: '1.1vw', color: C.dim }}>{label}</div>
    </div>
  )
}

function DayCell({ d, isToday }: { d: DayStat; isToday: boolean }) {
  const clean = d.filled && d.roomOk && d.goodBehavior
  const bg = clean ? C.good : d.filled ? C.ok : 'transparent'
  const g = dayAvg(d)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        aspectRatio: '1', borderRadius: '0.6vw', background: bg, display: 'grid', placeItems: 'center',
        border: d.filled ? 'none' : `2px dashed ${isToday ? C.gold : C.faint}`,
        color: '#14112A', fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.7vw',
        outline: isToday ? `3px solid ${C.gold}` : 'none', outlineOffset: 2,
      }}>{g === null ? '' : Math.round(g * 10) / 10 === Math.round(g) ? Math.round(g) : g.toFixed(1).replace('.', ',')}</div>
      <div style={{ fontSize: '1.15vw', color: isToday ? C.gold : C.dim, marginTop: '0.5vh' }}>{dow(d.date)}</div>
    </div>
  )
}

function Spark({ pts, color }: { pts: number[]; color: string }) {
  if (pts.length < 2) return <div style={{ width: '9vw' }} />
  const w = 120, h = 48, min = 2, max = 5
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (w - 8) + 4, h - 4 - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (h - 8)])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '9vw', flex: 'none' }} role="img" aria-label="Динамика средней оценки по неделям">
      <path d={xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="4.5" fill={color} />
    </svg>
  )
}

// One line at a time, crossfading — calm enough to leave on all evening.
function Ticker({ data }: { data: TvData }) {
  const items = data.feed.filter(f => f.title)
  const [i, setI] = useState(0)
  useEffect(() => { if (items.length < 2) return; const t = setInterval(() => setI(x => x + 1), 7000); return () => clearInterval(t) }, [items.length])
  const e = items[i % Math.max(items.length, 1)]
  const who = e?.childId ? data.children.find(c => c.childId === e.childId)?.name : null
  return (
    <footer key={e?.id} style={{ minHeight: '4vh', fontSize: '1.7vw', color: C.dim, display: 'flex', gap: '0.8vw', alignItems: 'center', animation: 'tvfade .8s ease both' }}>
      {e ? <><span>{e.icon ?? '•'}</span><span style={{ color: C.ink }}>{who ? `${who}: ` : ''}{e.title}</span>{e.amount ? <span style={{ color: e.amount > 0 ? C.good : C.bad }}>{e.amount > 0 ? '+' : ''}{e.amount}</span> : null}</> : <span>Событий пока нет</span>}
      <style>{`@keyframes tvfade{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){footer{animation:none!important}}`}</style>
    </footer>
  )
}
