'use client'

import { useState } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Sparkline, Bar, Coin, Tabs, Icon } from '../ui'
import type { ParentChild, ActionType } from '../types'

type Props = {
  child: ParentChild
  onBack: () => void
  onAction: (child: ParentChild, action: ActionType) => void
}

const TASKS = [
  { id: 't1', title: 'Make bed', coins: 2 },
  { id: 't2', title: 'Homework done', coins: 5 },
  { id: 't3', title: 'Room cleaned', coins: 3 },
  { id: 't4', title: '30 min exercise', coins: 5 },
  { id: 't5', title: 'Read 20 pages', coins: 3 },
]

export default function ChildProfile({ child, onBack, onAction }: Props) {
  const [tab, setTab] = useState('overview')

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Hero */}
      <div style={{
        padding: '16px 16px 20px',
        background: `linear-gradient(160deg, ${child.accent}22 0%, ${T.bg1} 60%)`,
        borderBottom: `1px solid ${T.cardBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: T.cardHi, border: `1px solid ${T.cardBorder}`,
            color: T.text, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevL" size={16}/>
          </button>
          <span style={{ fontSize: 13, color: T.muted }}>Children</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar child={child} size={64}/>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>{child.name}</h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Pill tone="indigo">LVL {child.level}</Pill>
              <Pill tone="warn">🔥 {child.streak}d</Pill>
              <Pill>Age {child.age}</Pill>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 5, fontFamily: T.fMono }}>
            <span>LVL {child.level} · {child.xp}% to next</span>
            <span>{child.xp}/100 XP</span>
          </div>
          <Bar pct={child.xp} color={child.accent}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Balance', value: `${child.balance.toLocaleString()}🪙`, color: T.cyan },
            { label: 'Today', value: `${child.todayDone}/${child.todayTotal}`, color: T.text },
            { label: 'Badges', value: String(child.badges), color: T.text },
          ].map(s => (
            <div key={s.label} style={{ padding: 10, background: T.card, borderRadius: T.r, border: `1px solid ${T.cardBorder}` }}>
              <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: T.fMono, fontSize: 16, fontWeight: 700, color: s.color, marginTop: 3 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn variant="success" size="md" icon="plus" full onClick={() => onAction(child, 'reward')}>Reward</Btn>
          <Btn variant="warn" size="md" icon="warn" full onClick={() => onAction(child, 'penalty')}>Penalty</Btn>
          <Btn variant="cyan" size="md" icon="snow" full onClick={() => onAction(child, 'freeze')}>Freeze</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 16px 0' }}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'subjects', label: 'Subjects' },
          { id: 'goals', label: 'Goals' },
        ]}/>
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card pad={14}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Last 7 days · coins earned
              </div>
              <Sparkline data={child.week} color={child.accent} w={300} h={60}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: T.muted, fontFamily: T.fMono }}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d}>{d}</span>)}
              </div>
            </Card>

            <Card pad={14} style={{ background: `linear-gradient(135deg, ${T.cyanSoft}, ${T.card})` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Saving for {child.goal.title}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {Math.round((child.goal.saved / child.goal.target) * 100)}% funded
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: T.fMono, fontSize: 13, color: T.text, fontWeight: 700 }}>
                  {child.goal.saved}<span style={{ color: T.muted }}>/{child.goal.target}</span>🪙
                </div>
              </div>
              <Bar pct={(child.goal.saved / child.goal.target) * 100} color={T.cyan}/>
            </Card>

            <Card pad={14}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Today's checklist
              </div>
              {TASKS.slice(0, 5).map((t, i) => {
                const done = i < child.todayDone
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${T.cardBorder}` : 'none' }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: done ? T.success : 'transparent',
                      border: `1.5px solid ${done ? T.success : T.muted}`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <Icon name="check" size={12} color="#fff"/>}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: done ? T.muted : T.text, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</span>
                    <Coin v={done ? t.coins : 0} neutral={!done}/>
                  </div>
                )
              })}
            </Card>
          </div>
        )}

        {tab === 'subjects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {child.subjects.map(s => (
              <Card key={s} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: T.r,
                  background: `${child.accent}22`, border: `1px solid ${child.accent}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>📖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{s}</div>
                </div>
                <Btn variant="primary" size="sm" icon="plus"
                  onClick={() => window.location.href = `/parent/daily?childId=${child.id}`}>
                  Grade
                </Btn>
              </Card>
            ))}
            {child.subjects.length === 0 && (
              <Card pad={20} style={{ textAlign: 'center', color: T.muted, fontSize: 13 }}>
                No subjects configured
              </Card>
            )}
          </div>
        )}

        {tab === 'goals' && (
          <Card pad={14} style={{ background: `linear-gradient(135deg, ${T.cyanSoft}, ${T.card})` }}>
            <div style={{ fontSize: 18, textAlign: 'center', marginBottom: 8 }}>🎯</div>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, color: T.text }}>{child.goal.title}</div>
            <div style={{ fontFamily: T.fMono, textAlign: 'center', fontSize: 24, fontWeight: 700, color: T.cyan, margin: '8px 0' }}>
              {child.goal.saved}<span style={{ color: T.muted, fontSize: 14 }}> / {child.goal.target} 🪙</span>
            </div>
            <Bar pct={(child.goal.saved / child.goal.target) * 100} color={T.cyan} h={8}/>
            <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 6, fontFamily: T.fMono }}>
              {child.goal.target - child.goal.saved} coins to go
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
