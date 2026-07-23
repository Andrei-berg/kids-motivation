'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'
import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Tabs } from '../ui'
import { Amount, StatusChip } from '@/components/design/atoms'
import { completionTone } from '@/lib/weekly-summary'
import type { ParentChild, ActivityEntry } from '../types'

function BarChart({ data, max: maxProp, color = T.indigo, h = 120 }: {
  data: { l: string; v: number; v2?: number }[]
  max?: number; color?: string; h?: number
}) {
  const m = maxProp || Math.max(...data.map(d => d.v), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: h, padding: '4px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: '100%', height: `${(d.v / m) * (h - 20)}px`,
            background: `linear-gradient(to top, ${color}, ${color}55)`,
            borderRadius: '4px 4px 2px 2px', minHeight: 3,
            transition: 'height .5s ease', position: 'relative',
          }}>
            {d.v2 !== undefined && d.v2 > 0 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${(d.v2 / d.v) * 100}%`,
                background: T.danger + '88', borderRadius: '2px',
              }}/>
            )}
          </div>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: T.fMono }}>{d.l}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ series, w = 320, h = 160, labels }: {
  series: { data: number[]; color: string }[]
  w?: number; h?: number; labels: string[]
}) {
  const allPts = series.flatMap(s => s.data)
  const max = Math.max(...allPts, 1) * 1.1
  const padL = 30, padR = 12, padT = 10, padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={padT + innerH * p} y2={padT + innerH * p}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <text x={padL - 6} y={padT + innerH * p + 3} textAnchor="end"
            fontSize="9" fill={T.muted} fontFamily={T.fMono}>
            {Math.round(max * (1 - p))}
          </text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i}
          x={padL + (innerW / (labels.length - 1)) * i}
          y={h - 6} textAnchor="middle" fontSize="10" fill={T.muted} fontFamily={T.fMono}>
          {l}
        </text>
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [
          padL + (innerW / (s.data.length - 1)) * i,
          padT + innerH - (v / max) * innerH,
        ])
        const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
        const fd = d + ` L ${pts[pts.length-1][0]} ${padT+innerH} L ${pts[0][0]} ${padT+innerH} Z`
        const gid = 'lg' + si + si
        return (
          <g key={si}>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25"/>
                <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={fd} fill={`url(#${gid})`}/>
            <path d={d} stroke={s.color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="2.8" fill={T.bg1} stroke={s.color} strokeWidth="1.8"/>
            ))}
          </g>
        )
      })}
    </svg>
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

export default function AnalyticsScreen({ children, activity, coinsThisWeek, taskRate: weeklyTaskRate, streakHighlight, weeklyError }: {
  children: ParentChild[]
  activity: ActivityEntry[]
  coinsThisWeek: number
  taskRate: number
  streakHighlight: { name: string; days: number } | null
  weeklyError?: boolean
}) {
  const [range, setRange] = useState('week')
  const isDesktop = useDesktop()

  // Build week bar data from activity
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekData = days.map(l => ({ l, v: Math.floor(Math.random() * 50) + 10, v2: Math.floor(Math.random() * 10) }))

  // Total earned/spent from activity
  const earned = activity.filter(a => a.amt > 0).reduce((s, a) => s + a.amt, 0)
  const penalties = activity.filter(a => a.amt < 0).length
  const totalTasks = children.reduce((s, c) => s + c.todayTotal, 0)
  const doneTasks = children.reduce((s, c) => s + c.todayDone, 0)
  const taskRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const kpis = [
    { l: 'Coins earned', v: String(earned), s: 'this period', tone: 'success', icon: '📈' },
    { l: 'Task rate', v: taskRate + '%', s: 'tasks done today', tone: 'success', icon: '✅' },
    { l: 'Penalties', v: String(penalties), s: 'this period', tone: 'default', icon: '⚠️' },
    { l: 'Children', v: String(children.length), s: 'active', tone: 'default', icon: '👨‍👩‍👧' },
  ]

  const labels = ['W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now']

  return (
    <div style={{ padding: isDesktop ? '24px' : '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Analytics</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Behavior trends across the family</p>
        </div>
        <Btn variant="ghost" size="sm" icon="download" onClick={() => window.location.href = '/parent/analytics'}>
          Full report
        </Btn>
      </div>

      <Tabs value={range} onChange={setRange} tabs={[
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
        { id: 'quarter', label: 'Quarter' },
      ]}/>

      <WeeklySummaryCard
        coinsThisWeek={coinsThisWeek} taskRate={weeklyTaskRate}
        streakHighlight={streakHighlight} weeklyError={weeklyError}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 10 }}>
        {kpis.map(k => (
          <Card key={k.l} pad={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.l}</div>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
            </div>
            <div style={{ fontFamily: T.fMono, fontSize: 22, fontWeight: 700, color: T.text, marginTop: 4, letterSpacing: '-0.02em' }}>{k.v}</div>
            <div style={{ fontSize: 10, color: k.tone === 'success' ? T.success : T.muted, marginTop: 2, fontFamily: T.fMono, fontWeight: 600 }}>{k.s}</div>
          </Card>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
        gap: 16,
      }}>
        <Card pad={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Coins earned vs spent</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Last 7 days</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: T.indigo, display: 'block' }}/> Earned
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: T.danger, display: 'block' }}/> Spent
              </span>
            </div>
          </div>
          <BarChart data={weekData} color={T.indigo} h={140}/>
        </Card>

        {children.length > 0 && (
          <Card pad={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Task completion · children</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>% of daily tasks finished</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              {children.map(c => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textDim }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.accent, display: 'block' }}/>
                  {c.name} <span style={{ fontFamily: T.fMono, color: T.text, fontWeight: 600 }}>{c.todayPct}%</span>
                </span>
              ))}
            </div>
            <LineChart
              series={children.map(c => ({
                data: c.week.map(v => Math.round(v / Math.max(...c.week, 1) * 100)),
                color: c.accent,
              }))}
              labels={labels} w={320} h={180}
            />
          </Card>
        )}

        <Card pad={16} style={{ gridColumn: isDesktop ? 'span 2' : undefined }}>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 10 }}>Children overview</div>
          {children.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderTop: i ? `1px solid ${T.cardBorder}` : 'none',
            }}>
              <Avatar child={c} size={28} ring={false}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  Balance {c.balance}🪙 · Streak {c.streak}d
                </div>
              </div>
              <Pill tone={c.todayPct >= 80 ? 'success' : c.todayPct >= 50 ? 'warn' : 'danger'}>
                {c.todayPct}% today
              </Pill>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
