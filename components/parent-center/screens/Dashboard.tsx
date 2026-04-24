'use client'

import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Sparkline, Ring, Coin, SectionH, Icon } from '../ui'
import type { ParentChild, ActivityEntry, ActionType } from '../types'
import type { RewardPurchase } from '@/lib/models/wallet.types'

type Props = {
  children: ParentChild[]
  activity: ActivityEntry[]
  pending: RewardPurchase[]
  onAction: (child: ParentChild, action: ActionType) => void
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
  onOpenChild: (id: string) => void
}

function ChildCard({ child, onAction }: { child: ParentChild; onAction: Props['onAction'] }) {
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar child={child} size={52}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h4 style={{ margin: 0, fontFamily: T.fHead, fontSize: 17, fontWeight: 600, color: T.text }}>{child.name}</h4>
            <Pill tone="indigo">LVL {child.level}</Pill>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: T.fMono, fontSize: 13, color: T.text, fontWeight: 600 }}>
              {child.balance.toLocaleString()}<span style={{ marginLeft: 3, opacity: 0.8 }}>🪙</span>
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.faint, display: 'block' }}/>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.warning, fontWeight: 600 }}>
              🔥 <span style={{ fontFamily: T.fMono }}>{child.streak}d</span>
            </span>
          </div>
        </div>
        <Ring pct={child.todayPct} size={44} stroke={4} color={child.accent}>
          <span style={{ color: child.accent, fontSize: 9 }}>{child.todayPct}%</span>
        </Ring>
      </div>

      <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            Last 7 days · coins
          </div>
          <Sparkline data={child.week} color={child.accent} w={160} h={32}/>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today</div>
          <div style={{ fontFamily: T.fMono, fontSize: 14, color: T.text, fontWeight: 600 }}>
            {child.todayDone}/{child.todayTotal}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        background: T.cardBorder, borderTop: `1px solid ${T.cardBorder}`,
      }}>
        {([
          { label: 'Reward', icon: '🌟', act: 'reward' as ActionType },
          { label: 'Penalty', icon: '⚠️', act: 'penalty' as ActionType },
          { label: 'Freeze', icon: '❄️', act: 'freeze' as ActionType },
          { label: 'Bonus', icon: '💰', act: 'bonus' as ActionType },
        ]).map(b => (
          <button key={b.act}
            onClick={e => { e.stopPropagation(); onAction(child, b.act) }}
            style={{
              background: T.card, border: 'none', padding: '12px 4px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              fontFamily: T.fBody, fontSize: 11, fontWeight: 600, color: T.textDim,
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = T.cardHi)}
            onMouseLeave={e => (e.currentTarget.style.background = T.card)}
          >
            <span style={{ fontSize: 16 }}>{b.icon}</span>
            {b.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

function ActivityRow({ a, allChildren }: { a: ActivityEntry; allChildren: ParentChild[] }) {
  const child = allChildren.find(c => c.id === a.who)
  if (!child) return null
  const toneMap: Record<string, 'success' | 'danger' | 'indigo'> = {
    earn_coins: 'success', penalty: 'danger', bonus: 'indigo',
  }
  const labelMap: Record<string, string> = { earn_coins: 'EARN', penalty: 'PENALTY', bonus: 'BONUS' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: `1px solid ${T.cardBorder}` }}>
      <Avatar child={child} size={32} ring={false}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{a.text}</span>
          <Pill tone={toneMap[a.type]} style={{ height: 18, fontSize: 9 }}>{labelMap[a.type]}</Pill>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.fMono }}>
          {child.name} · {a.time}
        </div>
      </div>
      <Coin v={a.amt}/>
    </div>
  )
}

export default function Dashboard({ children, activity, pending, onAction, onApprove, onDecline, onOpenChild }: Props) {
  const filledCount = children.filter(c => c.todayPct > 50).length
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <h1 style={{ margin: '4px 0 0', fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
          {greeting}
        </h1>
      </div>

      <Card pad={14} style={{ background: `linear-gradient(135deg, ${T.indigoSoft} 0%, ${T.card} 55%)`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Ring pct={(filledCount / Math.max(children.length, 1)) * 100} size={44} stroke={4} color={T.indigo}>
          <span style={{ color: T.indigoHi, fontSize: 10 }}>{filledCount}/{children.length}</span>
        </Ring>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
            Today filled: {filledCount} of {children.length} children
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {filledCount < children.length ? 'Fill the remaining evaluations to close the day' : 'All set for today'}
          </div>
        </div>
        <Btn variant="solid" size="sm" onClick={() => window.location.href = '/parent/daily'}>Fill day</Btn>
      </Card>

      <div>
        <SectionH title="Children" sub="Tap a card to open full profile"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children.map(c => (
            <div key={c.id} onClick={() => onOpenChild(c.id)} style={{ cursor: 'pointer' }}>
              <ChildCard child={c} onAction={onAction}/>
            </div>
          ))}
          {children.length === 0 && (
            <Card pad={24} style={{ textAlign: 'center' }}>
              <div style={{ color: T.muted, fontSize: 13 }}>No children found</div>
            </Card>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <SectionH title="Pending approvals" sub={`${pending.length} shop request${pending.length > 1 ? 's' : ''}`}
            action={<Pill tone="warn" icon="bell">Action needed</Pill>}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(p => {
              const child = children.find(c => c.id === p.child_id)
              if (!child) return null
              return (
                <Card key={p.id} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar child={child} size={36}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
                      {child.name} wants <span style={{ color: T.cyan }}>{p.reward_title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      <span style={{ fontFamily: T.fMono, fontWeight: 600 }}>{p.frozen_coins}🪙</span>
                    </div>
                  </div>
                  <Btn variant="ghost" size="sm" icon="x" onClick={() => onDecline(p)}>Decline</Btn>
                  <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)}>Approve</Btn>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <SectionH title="Activity" sub="Recent actions across all children"
          action={<Btn variant="outline" size="sm" icon="filter">All</Btn>}/>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {activity.slice(0, 8).map((a, i) => <ActivityRow key={i} a={a} allChildren={children}/>)}
          {activity.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>No recent activity</div>
          )}
          {activity.length > 0 && (
            <button
              onClick={() => window.location.href = '/parent/wallets'}
              style={{
                width: '100%', padding: 12, background: 'transparent', border: 'none',
                color: T.muted, fontFamily: T.fBody, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
              View all activity →
            </button>
          )}
        </Card>
      </div>
    </div>
  )
}
