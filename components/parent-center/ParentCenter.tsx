'use client'

import { useState, useEffect } from 'react'
import { T, CHILD_ACCENTS } from './tokens'
import { Icon, Toast } from './ui'
import Dashboard from './screens/Dashboard'
import { ChildrenScreen, TasksScreen, ShopScreen } from './screens/ChildrenTasksShop'
import AnalyticsScreen from './screens/Analytics'
import SettingsScreen from './screens/Settings'
import ChildProfile from './screens/ChildProfile'
import ActionModal from './screens/ActionModal'
import ChatPanel from './screens/ChatPanel'
import type { ParentChild, ActivityEntry, ActionType, ToastState, ModalState, Route } from './types'
import type { RewardPurchase, Reward } from '@/lib/models/wallet.types'
import { getChildren, getDay } from '@/lib/repositories/children.repo'
import { getWallet, getPendingPurchases, approvePurchase, rejectPurchase, getTransactions, getRewards } from '@/lib/repositories/wallet.repo'
import { getStreaks } from '@/lib/repositories/children.repo'
import { getWeekScore } from '@/lib/services/coins.service'
import { getWeekRange } from '@/utils/helpers'
import { getSubjects } from '@/lib/flexible-api'

export default function ParentCenter() {
  const [route, setRoute] = useState<Route>('dashboard')
  const [openChild, setOpenChild] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, child: null, action: null })

  const [children, setChildren] = useState<ParentChild[]>([])
  const [pending, setPending] = useState<RewardPurchase[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  const notify = (msg: string, tone?: 'warn' | 'danger') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(null), 2400)
  }

  useEffect(() => {
    async function loadAll() {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const weekStart = getWeekRange(new Date()).start

        const rawChildren = await getChildren()
        const [pendingData, rewardsData, txData] = await Promise.all([
          getPendingPurchases().catch(() => [] as RewardPurchase[]),
          getRewards({ activeOnly: true }).catch(() => [] as Reward[]),
          getTransactions(undefined, 30).catch(() => []),
        ])

        const parentChildren = await Promise.all(
          rawChildren.map(async (c, idx) => {
            const [wallet, dayData, weekScore, streaks, subjects] = await Promise.all([
              getWallet(c.id).catch(() => null),
              getDay(c.id, today).catch(() => null),
              getWeekScore(c.id, weekStart).catch(() => ({ total: 0, coinsFromGrades: 0, coinsFromRoom: 0, coinsFromBehavior: 0, gradedDays: 0, roomOkDays: 0, filledDays: 0 })),
              getStreaks(c.id).catch(() => []),
              getSubjects(c.id).catch(() => []),
            ])

            const maxStreak = streaks.reduce((max: number, s: any) => Math.max(max, s.current_count ?? 0), 0)

            const roomOk = !!(dayData?.room_ok)
            const behaviorOk = !!(dayData?.good_behavior)
            const todayDone = [roomOk, behaviorOk].filter(Boolean).length
            const todayTotal = 5

            // Build week sparkline: use daily total from weekScore or simple approximation
            const weekCoins = [
              weekScore.total * 0.12, weekScore.total * 0.15, weekScore.total * 0.1,
              weekScore.total * 0.18, weekScore.total * 0.14, weekScore.total * 0.2, weekScore.total * 0.11,
            ].map(Math.round)

            const pc: ParentChild = {
              id: c.id,
              name: c.name,
              avatar: c.emoji,
              age: c.age,
              level: c.level,
              xp: c.xp,
              balance: wallet?.coins ?? 0,
              streak: maxStreak,
              accent: CHILD_ACCENTS[idx % CHILD_ACCENTS.length],
              todayPct: Math.round((todayDone / todayTotal) * 100),
              todayDone,
              todayTotal,
              mode: c.kid_fill_mode,
              week: weekCoins.length === 7 ? weekCoins : [10, 15, 8, 20, 12, 18, 9],
              subjects: subjects.map((s: any) => s.name ?? s.subject_name ?? String(s)),
              badges: 0,
              goal: { title: 'Big reward', saved: wallet?.coins ?? 0, target: 5000 },
            }
            return pc
          })
        )

        // Build activity from recent transactions
        const acts: ActivityEntry[] = txData
          .filter(tx => tx.coins_change !== 0)
          .slice(0, 20)
          .map(tx => {
            const amt = tx.coins_change
            return {
              who: tx.child_id,
              text: tx.description ?? (amt > 0 ? 'Coins earned' : 'Coins spent'),
              type: amt > 0 ? 'earn_coins' : 'penalty',
              amt,
              time: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            } as ActivityEntry
          })
          .filter(a => parentChildren.some(c => c.id === a.who))

        setChildren(parentChildren)
        setPending(pendingData)
        setRewards(rewardsData)
        setActivity(acts)
      } catch (e) {
        console.error('[ParentCenter] load error', e)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  const openAction = (child: ParentChild, action: ActionType) => setModal({ open: true, child, action })
  const closeAction = () => setModal(m => ({ ...m, open: false }))
  const confirmAction = (data: { child: ParentChild; action: ActionType; amount: number; reason: string }) => {
    const map: Record<ActionType, string> = { reward: 'Rewarded', penalty: 'Penalty applied to', bonus: 'Bonus for', freeze: 'Froze streak for' }
    notify(`${map[data.action]} ${data.child.name}${data.action !== 'freeze' ? ' · ' + (data.amount > 0 ? '+' : '') + data.amount + '🪙' : ''}`,
      data.action === 'penalty' ? 'warn' : undefined)
  }

  const handleApprove = async (p: RewardPurchase) => {
    try {
      await approvePurchase(p.id)
      setPending(prev => prev.filter(x => x.id !== p.id))
      notify(`Approved: ${p.reward_title}`)
    } catch {
      notify('Failed to approve', 'danger')
    }
  }

  const handleDecline = async (p: RewardPurchase) => {
    try {
      await rejectPurchase(p.id)
      setPending(prev => prev.filter(x => x.id !== p.id))
      notify(`Declined: ${p.reward_title}`, 'warn')
    } catch {
      notify('Failed to decline', 'danger')
    }
  }

  const onOpenChild = (id: string) => { setOpenChild(id); setRoute('child') }
  const backFromChild = () => { setOpenChild(null); setRoute('children') }

  const activeChild = children.find(c => c.id === openChild) ?? null

  const navItems = [
    { id: 'dashboard' as Route, label: 'Home', icon: 'home' },
    { id: 'children' as Route, label: 'Children', icon: 'users' },
    { id: 'tasks' as Route, label: 'Tasks', icon: 'tasks' },
    { id: 'shop' as Route, label: 'Shop', icon: 'shop' },
    { id: 'analytics' as Route, label: 'Stats', icon: 'chart' },
  ]
  const pendingCount = pending.length

  const renderScreen = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted, flexDirection: 'column', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `2px solid ${T.indigo}`, borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}/>
          <span style={{ fontSize: 13 }}>Loading...</span>
        </div>
      )
    }
    switch (route) {
      case 'dashboard':
        return <Dashboard children={children} activity={activity} pending={pending}
          onAction={openAction} onApprove={handleApprove} onDecline={handleDecline} onOpenChild={onOpenChild}/>
      case 'children':
        return <ChildrenScreen children={children} onOpenChild={onOpenChild}/>
      case 'tasks':
        return <TasksScreen/>
      case 'shop':
        return <ShopScreen pending={pending} rewards={rewards} onApprove={handleApprove} onDecline={handleDecline}/>
      case 'analytics':
        return <AnalyticsScreen children={children} activity={activity}/>
      case 'settings':
        return <SettingsScreen allChildren={children} notify={(msg, tone) => notify(msg, tone as any)}/>
      case 'child':
        return activeChild
          ? <ChildProfile child={activeChild} onBack={backFromChild} onAction={openAction}/>
          : null
      default:
        return null
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg0, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: T.fBody, color: T.text,
      maxWidth: 480, margin: '0 auto',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: T.bg1, borderBottom: `1px solid ${T.cardBorder}`, zIndex: 50,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff',
          boxShadow: `0 3px 12px ${T.indigo}55`,
        }}>P</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fHead, fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>Parent Center</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>Family · {children.length} {children.length === 1 ? 'child' : 'children'}</div>
        </div>
        <button onClick={() => setRoute('settings')} style={{
          width: 32, height: 32, borderRadius: '50%',
          background: T.cardHi, border: `1px solid ${T.cardBorder}`,
          color: T.text, cursor: 'pointer', position: 'relative',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bell" size={15}/>
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 14, height: 14, padding: '0 3px',
              background: T.danger, borderRadius: T.rPill,
              color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.fMono, border: `2px solid ${T.bg1}`,
            }}>{pendingCount}</span>
          )}
        </button>
        <button style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
          border: 'none', color: '#fff', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
        }}>P</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch' as any }}>
        {renderScreen()}
      </div>

      {/* Chat floating button */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{
          position: 'absolute', bottom: 72, right: 16,
          width: 52, height: 52, borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
          border: 'none', color: '#fff', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px ${T.indigo}55, 0 0 0 1px rgba(255,255,255,0.1) inset`,
          zIndex: 40,
        }}>
          <Icon name="msg" size={22}/>
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: T.danger, border: `2px solid ${T.bg0}`,
            }}/>
          )}
        </button>
      )}

      {/* Bottom nav */}
      <div style={{
        flexShrink: 0,
        display: 'grid', gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
        background: T.bg1, borderTop: `1px solid ${T.cardBorder}`, zIndex: 50,
      }}>
        {navItems.map(n => {
          const active = route === n.id || (n.id === 'children' && route === 'child')
          return (
            <button key={n.id} onClick={() => setRoute(n.id)} style={{
              height: 56, background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              color: active ? T.indigoHi : T.muted, position: 'relative', transition: 'color .15s',
            }}>
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2, borderRadius: 2, background: T.indigoHi,
                  boxShadow: `0 0 8px ${T.indigo}`,
                }}/>
              )}
              <Icon name={n.icon} size={19} stroke={active ? 2 : 1.6}/>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.01em' }}>{n.label}</span>
            </button>
          )
        })}
      </div>

      {/* Settings accessible via bell/button */}
      <ChatPanel
        open={chatOpen} onClose={() => setChatOpen(false)}
        children={children} pending={pending}
        onApprove={handleApprove} onDecline={handleDecline}
      />

      <ActionModal
        open={modal.open} child={modal.child} action={modal.action}
        onClose={closeAction} onConfirm={confirmAction}
      />

      <Toast toast={toast}/>
    </div>
  )
}
