'use client'

// Family board for a TV (Google TV Streamer, viewed from ~3 m). No interaction: it
// pairs once with a code, then polls /api/tv/data and shows each child's week.
// Deliberately its own dark palette — a lit-up living room in the evening, not
// the paper/daylight themes of the phone UI.

import { useEffect, useRef, useState } from 'react'
import type { ChildStats, FamilyStats, DayStat } from '@/lib/stats/family-stats'

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

type Phase = { k: 'boot' } | { k: 'pair'; code: string } | { k: 'board'; data: FamilyStats } | { k: 'offline'; data: FamilyStats | null }

export default function TvPage() {
  const [phase, setPhase] = useState<Phase>({ k: 'boot' })
  const secret = useRef<string | null>(null)
  const last = useRef<FamilyStats | null>(null)

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

function Board({ data, stale }: { data: FamilyStats; stale?: boolean }) {
  const kids = data.children
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])

  if (!kids.length) return <Center text="Добавьте детей в Parent Center, и здесь появится табло" />
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', padding: '3.5vh 3.5vw', gap: '2.5vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: DISPLAY, fontSize: '2.2vw', fontWeight: 600 }}>
          {now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ fontSize: '1.6vw', color: stale ? C.bad : C.dim }}>
          {stale ? 'Нет связи, показаны последние данные' : now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kids.length, 4)}, 1fr)`, gap: '1.6vw', minHeight: 0 }}>
        {kids.slice(0, 4).map((k, i) => <Lane key={k.childId} k={k} accent={ACCENTS[i % ACCENTS.length]} />)}
      </main>
      <Ticker data={data} />
    </div>
  )
}

function Lane({ k, accent }: { k: ChildStats; accent: string }) {
  const week = k.days.slice(-7)
  const prev = k.days.slice(-14, -7)
  const weekGrades = week.flatMap(d => d.grades)
  const weekAvg = weekGrades.length ? weekGrades.reduce((a, b) => a + b, 0) / weekGrades.length : null
  const coins = week.reduce((a, d) => a + d.coinsIn, 0)
  const prevCoins = prev.reduce((a, d) => a + d.coinsIn, 0)
  const trend = k.weeks.filter(w => w.avg !== null).slice(-5)
  const today = week[week.length - 1]?.date

  return (
    <section style={{ background: C.panel, borderRadius: '1.6vw', padding: '2.2vh 1.8vw', display: 'flex', flexDirection: 'column', gap: '2.2vh', minWidth: 0, borderTop: `0.5vh solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
        <div style={{ width: '4.2vw', height: '4.2vw', borderRadius: '50%', background: accent + '33', display: 'grid', placeItems: 'center', fontSize: '2.4vw', overflow: 'hidden', flex: 'none' }}>
          {k.avatarUrl ? <img src={k.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : k.emoji}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: '2.6vw', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1vw' }}>
        <div>
          <div style={{ fontSize: '1.4vw', color: C.dim }}>Средняя оценка за неделю</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '7vw', lineHeight: 1, color: gradeColor(weekAvg), marginTop: '0.6vh' }}>
            {weekAvg === null ? '–' : weekAvg.toFixed(1).replace('.', ',')}
          </div>
        </div>
        <Spark pts={trend.map(w => w.avg as number)} color={gradeColor(weekAvg)} />
      </div>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5vw' }}>
          {week.map(d => <DayCell key={d.date} d={d} isToday={d.date === today} />)}
        </div>
        <div style={{ fontSize: '1.15vw', color: C.dim, marginTop: '1vh', display: 'flex', gap: '1.2vw' }}>
          <Key c={C.good} t="всё сделано" /><Key c={C.ok} t="частично" /><Key c={C.faint} t="не заполнен" />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.1vh' }}>
        {k.subjects.slice(0, 5).map(s => (
          <div key={s.subject} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '0.8vw', fontSize: '1.55vw' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5vw' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject}</span>
                <span style={{ color: C.dim, flex: 'none' }}>{s.trend === null || Math.abs(s.trend) < 0.2 ? '' : s.trend > 0 ? '↑' : '↓'}</span>
              </div>
              <div style={{ height: '0.7vh', background: C.line, borderRadius: 99, marginTop: '0.4vh' }}>
                <div style={{ width: `${(s.avg / 5) * 100}%`, height: '100%', background: gradeColor(s.avg), borderRadius: 99 }} />
              </div>
            </div>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: gradeColor(s.avg), width: '3.2vw', textAlign: 'right' }}>{s.avg.toFixed(1).replace('.', ',')}</span>
          </div>
        ))}
        {!k.subjects.length && <div style={{ color: C.faint, fontSize: '1.5vw' }}>Оценок за 4 недели пока нет</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.line}`, paddingTop: '1.6vh', fontSize: '1.5vw' }}>
        <Stat big={k.streak.current ? `🔥 ${k.streak.current}` : '–'} label="дней подряд" />
        <Stat big={`+${fmt(coins)}`} label={prevCoins ? `за неделю, была ${fmt(prevCoins)}` : 'монет за неделю'} tone={coins >= prevCoins ? C.good : C.dim} />
        <Stat big={fmt(k.balance)} label="на счёте" tone={C.gold} />
      </div>
    </section>
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
function Ticker({ data }: { data: FamilyStats }) {
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
