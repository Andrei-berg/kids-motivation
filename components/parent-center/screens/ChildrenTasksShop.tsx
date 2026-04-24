'use client'

import { useState } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Bar, Coin, Icon, Tabs, SectionH } from '../ui'
import type { ParentChild } from '../types'
import type { RewardPurchase, Reward } from '@/lib/models/wallet.types'

// ═══════════ CHILDREN ═══════════
export function ChildrenScreen({ children, onOpenChild }: {
  children: ParentChild[]
  onOpenChild: (id: string) => void
}) {
  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Children</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Full profiles, stats, and settings per child</p>
      </div>

      {children.map(c => (
        <Card key={c.id} pad={16} hover onClick={() => onOpenChild(c.id)}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <Avatar child={c} size={56}/>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontFamily: T.fHead, fontSize: 18, fontWeight: 600, color: T.text }}>{c.name}</h3>
                <Pill tone="indigo">LVL {c.level}</Pill>
                <Pill tone="warn">🔥 {c.streak}d</Pill>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{c.age} years · Mode {c.mode} independence</div>
            </div>
            <Icon name="chevR" size={18} color={T.muted}/>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 5, fontFamily: T.fMono }}>
              <span>LVL {c.level}</span><span>{c.xp}/100 XP</span>
            </div>
            <Bar pct={c.xp} color={c.accent}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Balance', value: c.balance.toLocaleString(), unit: '🪙' },
              { label: 'Streak', value: c.streak, unit: 'days' },
              { label: 'Badges', value: c.badges, unit: 'earned' },
              { label: 'Today', value: c.todayPct + '%', unit: 'done' },
            ].map(s => (
              <div key={s.label} style={{ background: T.bg1, borderRadius: T.r, padding: 10, border: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                <div style={{ fontFamily: T.fMono, fontWeight: 600, fontSize: 15, color: T.text, marginTop: 3 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: T.faint, marginTop: 1 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: 12, background: T.bg1, borderRadius: T.r, border: `1px solid ${T.cardBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: T.textDim, fontWeight: 600 }}>🎯 Goal: {c.goal.title}</div>
              <div style={{ fontFamily: T.fMono, fontSize: 12, color: T.text, fontWeight: 600 }}>
                {c.goal.saved}<span style={{ color: T.muted }}>/{c.goal.target}</span>
              </div>
            </div>
            <Bar pct={(c.goal.saved / c.goal.target) * 100} color={T.cyan}/>
          </div>
        </Card>
      ))}

      <Btn variant="ghost" size="lg" icon="plus" full onClick={() => window.location.href = '/register'}>Add child</Btn>
    </div>
  )
}

// ═══════════ TASKS ═══════════
const MOCK_TASKS = [
  { id: 't1', title: 'Make bed', coins: 2, cat: 'chore', who: 'both', freq: 'Daily' },
  { id: 't2', title: 'Homework done', coins: 5, cat: 'study', who: 'both', freq: 'Daily' },
  { id: 't3', title: 'Room cleaned', coins: 3, cat: 'chore', who: 'both', freq: 'Daily' },
  { id: 't4', title: '30 min exercise', coins: 5, cat: 'sport', who: 'both', freq: 'Daily' },
  { id: 't5', title: 'Read 20 pages', coins: 3, cat: 'study', who: 'both', freq: 'Daily' },
  { id: 't6', title: 'Brush teeth (PM)', coins: 1, cat: 'behavior', who: 'both', freq: 'Daily' },
]
const MOCK_CHALLENGES = [
  { id: 'c1', title: '3 A-grades this week', reward: 200, progress: 2, total: 3, expires: 'Sun' },
  { id: 'c2', title: 'Month without Grade 2', reward: 500, progress: 18, total: 30, expires: 'Apr 30' },
  { id: 'c3', title: '5-day exercise streak', reward: 150, progress: 3, total: 5, expires: 'Fri' },
]

export function TasksScreen() {
  const [tab, setTab] = useState('daily')
  const catColor: Record<string, string> = { chore: T.cyan, study: T.indigo, sport: T.success, behavior: T.warning }
  const catEmoji: Record<string, string> = { chore: '🧹', study: '📚', sport: '🏃', behavior: '⭐' }

  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Tasks</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Daily tasks, weekly & special challenges</p>
        </div>
        <Btn variant="primary" size="md" icon="plus">New</Btn>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'daily', label: 'Daily', icon: '📋' },
        { id: 'weekly', label: 'Challenges', icon: '🏆' },
        { id: 'templates', label: 'Templates', icon: '📂' },
      ]}/>

      {tab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_TASKS.map(t => (
            <Card key={t.id} pad={14} hover style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: T.r,
                background: `${catColor[t.cat]}18`, border: `1px solid ${catColor[t.cat]}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{catEmoji[t.cat]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  <Pill>{t.freq}</Pill>
                  <Pill tone="indigo">All children</Pill>
                </div>
              </div>
              <Coin v={t.coins}/>
              <button style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 6 }}>
                <Icon name="dots" size={18}/>
              </button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_CHALLENGES.map(ch => {
            const pct = (ch.progress / ch.total) * 100
            return (
              <Card key={ch.id} pad={16} style={{
                background: pct >= 100 ? `linear-gradient(135deg, ${T.successSoft}, ${T.card})` : T.card,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{ch.title}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>Expires {ch.expires}</div>
                  </div>
                  <Coin v={ch.reward} big/>
                </div>
                <Bar pct={pct} color={pct >= 100 ? T.success : T.indigo}/>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontFamily: T.fMono, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ch.progress} of {ch.total}</span><span>{Math.round(pct)}%</span>
                </div>
              </Card>
            )
          })}
          <Btn variant="ghost" size="md" icon="plus" full>New challenge</Btn>
        </div>
      )}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { n: 'Chores', icon: '🧹', count: 8, color: T.cyan },
            { n: 'Homework', icon: '📚', count: 12, color: T.indigo },
            { n: 'Sports', icon: '🏃', count: 6, color: T.success },
            { n: 'Behavior', icon: '⭐', count: 5, color: T.warning },
          ].map(t => (
            <Card key={t.n} pad={14} hover>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.n}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.fMono, marginTop: 2 }}>{t.count} templates</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════ SHOP ═══════════
export function ShopScreen({ pending, rewards, onApprove, onDecline }: {
  pending: RewardPurchase[]
  rewards: Reward[]
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
  children?: ParentChild[]
}) {
  const [tab, setTab] = useState('items')
  const physicalRewards = rewards.filter(r => !r.category.toLowerCase().includes('virtual'))
  const virtualRewards = rewards.filter(r => r.category.toLowerCase().includes('virtual'))
  const displayRewards = tab === 'virtual' ? virtualRewards : physicalRewards

  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Reward Shop</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>What kids can trade coins for</p>
        </div>
        <Btn variant="primary" size="md" icon="plus" onClick={() => window.location.href = '/parent/shop'}>Add</Btn>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'items', label: 'Items', icon: '🛒' },
        { id: 'virtual', label: 'Virtual', icon: '🎨' },
        { id: 'queue', label: `Queue (${pending.length})`, icon: '⏳' },
      ]}/>

      {(tab === 'items' || tab === 'virtual') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {displayRewards.map(r => (
            <Card key={r.id} pad={14} hover style={{ position: 'relative' }}>
              <div style={{
                width: 48, height: 48, borderRadius: T.r, background: T.bg1, border: `1px solid ${T.cardBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 10,
              }}>{r.icon}</div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 600, lineHeight: 1.2 }}>{r.title}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{r.category}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontFamily: T.fMono, fontSize: 14, fontWeight: 700, color: T.cyan }}>
                  {r.price_coins ?? 0}🪙
                </span>
              </div>
            </Card>
          ))}
          {displayRewards.length === 0 && (
            <Card pad={24} style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🛒</div>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>No items yet</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>Add rewards for kids to redeem</div>
            </Card>
          )}
        </div>
      )}

      {tab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(p => (
            <Card key={p.id} pad={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: T.r, background: T.bg1,
                  border: `1px solid ${T.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>{p.reward_icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Requested</div>
                  <div style={{ fontSize: 15, color: T.cyan, fontWeight: 600, marginTop: 2 }}>{p.reward_title}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.fMono, fontSize: 15, fontWeight: 700, color: T.text }}>{p.frozen_coins}🪙</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="danger" size="md" icon="x" onClick={() => onDecline(p)} full>Decline</Btn>
                <Btn variant="success" size="md" icon="check" onClick={() => onApprove(p)} full>Approve</Btn>
              </div>
            </Card>
          ))}
          {pending.length === 0 && (
            <Card pad={24} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>✨</div>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>No pending requests</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>Kids' shop requests will appear here</div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
