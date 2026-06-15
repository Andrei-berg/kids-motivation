'use client'

import { useState, useEffect } from 'react'
import { useT, useLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n'
import { T, CHILD_ACCENTS } from './tokens'
import { Icon, Toast } from './ui'
import Dashboard from './screens/Dashboard'
import { ChildrenScreen, TasksScreen, ShopScreen } from './screens/ChildrenTasksShop'
import AnalyticsScreen from './screens/Analytics'
import SettingsScreen from './screens/Settings'
import ChildProfile from './screens/ChildProfile'
import AuditScreen from './screens/AuditScreen'
import WalletsScreen from './screens/WalletsScreen'
import ExpensesPanel from './screens/ExpensesPanel'
import ActionModal from './screens/ActionModal'
import ChatPanel from './screens/ChatPanel'
import DailyModal from '@/components/DailyModal'
import type { ParentChild, ActivityEntry, ActionType, ToastState, ModalState, Route } from './types'
import type { RewardPurchase } from '@/lib/models/wallet.types'
import { getChildren, getDay } from '@/lib/repositories/children.repo'
import { getWallet, getPendingPurchases, getTransactions } from '@/lib/repositories/wallet.repo'
import { approvePurchaseAction, rejectPurchaseAction } from '@/app/parent/shop/actions'
import { getStreaks } from '@/lib/repositories/children.repo'
import { getWeekScore } from '@/lib/services/coins.service'
import { getWeekRange, localDateString } from '@/utils/helpers'
import { getSubjects } from '@/lib/flexible-api'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import { useAppStore } from '@/lib/store'

function useDesktop() {
  const [is, setIs] = useState(false)
  useEffect(() => {
    const check = () => setIs(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return is
}

function ParentCenterSkeleton() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header tabs row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        {[80, 60, 50, 60, 48].map((w, i) => (
          <div key={i} className="parent-skeleton" style={{ width: w, height: 32, borderRadius: 999 }}/>
        ))}
      </div>
      {/* Child card 1 */}
      <div className="parent-skeleton" style={{ height: 140, borderRadius: 16 }}/>
      {/* Child card 2 */}
      <div className="parent-skeleton" style={{ height: 140, borderRadius: 16 }}/>
      {/* Activity feed header */}
      <div className="parent-skeleton" style={{ height: 20, width: 120, borderRadius: 8 }}/>
      {/* Activity rows */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="parent-skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="parent-skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }}/>
            <div className="parent-skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }}/>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ParentCenter() {
  const t = useT()
  const { familyId } = useAppStore()
  const { language, setLanguage } = useLanguage()
  const [route, setRoute] = useState<Route>('dashboard')
  const [openChild, setOpenChild] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, child: null, action: null })

  const [children, setChildren] = useState<ParentChild[]>([])
  const [pending, setPending] = useState<RewardPurchase[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyModal, setDailyModal] = useState<{ open: boolean; childId: string }>({ open: false, childId: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const isDesktop = useDesktop()

  const openFillDay = () => {
    const firstChild = children[0]
    if (firstChild) setDailyModal({ open: true, childId: firstChild.id })
  }
  const closeFillDay = () => setDailyModal(m => ({ ...m, open: false }))

  const notify = (msg: string, tone?: 'warn' | 'danger') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(null), 2400)
  }

  useEffect(() => {
    async function loadAll() {
      try {
        const today = localDateString()
        const weekStart = getWeekRange(new Date()).start

        const rawChildren = await getChildren()
        const [pendingData, txData] = await Promise.all([
          getPendingPurchases().catch(() => [] as RewardPurchase[]),
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
        setActivity(acts)
      } catch (e) {
        console.error('[ParentCenter] load error', e)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [refreshKey])

  const openAction = (child: ParentChild, action: ActionType) => setModal({ open: true, child, action })
  const closeAction = () => setModal(m => ({ ...m, open: false }))
  const confirmAction = (data: { child: ParentChild; action: ActionType; amount: number; reason: string }) => {
    const map: Record<ActionType, string> = { reward: 'Rewarded', penalty: 'Penalty applied to', bonus: 'Bonus for', freeze: 'Froze streak for' }
    notify(`${map[data.action]} ${data.child.name}${data.action !== 'freeze' ? ' · ' + (data.amount > 0 ? '+' : '') + data.amount + '🪙' : ''}`,
      data.action === 'penalty' ? 'warn' : undefined)
    void insertAuditEvent({
      family_id: familyId ?? '',
      child_id: data.child.id,
      action_type: 'coin_adjust',
      description: `${data.action === 'reward' ? 'Rewarded' : data.action === 'penalty' ? 'Penalized' : 'Bonus for'} ${data.child.name}: ${data.amount > 0 ? '+' : ''}${data.amount}💰${data.reason ? ` — ${data.reason}` : ''}`,
      coins_delta: data.action === 'freeze' ? null : data.amount,
      actor_user_id: null,
      metadata: { action: data.action, reason: data.reason },
    })
  }

  const handleApprove = async (p: RewardPurchase) => {
    try {
      await approvePurchaseAction(p.id)
      setPending(prev => prev.filter(x => x.id !== p.id))
      notify(`Approved: ${p.reward_title}`)
    } catch (e: any) {
      notify(`Failed to approve: ${e?.message ?? 'unknown error'}`, 'danger')
    }
  }

  const handleDecline = async (p: RewardPurchase) => {
    try {
      await rejectPurchaseAction(p.id)
      setPending(prev => prev.filter(x => x.id !== p.id))
      const refunded = p.price_coins && p.frozen_coins === 0 ? ` (↩️ ${p.price_coins}🪙 returned)` : ''
      notify(`Declined: ${p.reward_title}${refunded}`, 'warn')
    } catch (e: any) {
      notify(`Failed to decline: ${e?.message ?? 'unknown error'}`, 'danger')
    }
  }

  const onOpenChild = (id: string) => { setOpenChild(id); setRoute('child') }
  const backFromChild = () => { setOpenChild(null); setRoute('children') }

  const activeChild = children.find(c => c.id === openChild) ?? null

  const navItems = [
    { id: 'dashboard' as Route, label: t('parentNav.home'), icon: 'home' },
    { id: 'children' as Route, label: t('parentNav.children'), icon: 'users' },
    { id: 'tasks' as Route, label: t('parentNav.tasks'), icon: 'tasks' },
    { id: 'shop' as Route, label: t('nav.shop'), icon: 'shop' },
    { id: 'analytics' as Route, label: t('parentNav.stats'), icon: 'chart' },
    { id: 'expenses' as Route, label: 'Расходы', icon: 'wallet' },
    { id: 'audit' as Route, label: t('audit.navLabel'), icon: 'tasks' },
  ]
  const pendingCount = pending.length

  const langNext = SUPPORTED_LANGUAGES.find(l => l.code !== language) ?? SUPPORTED_LANGUAGES[0]
  const LangToggle = ({ style }: { style?: React.CSSProperties }) => (
    <button
      onClick={() => setLanguage(langNext.code)}
      title={langNext.label}
      style={{
        height: 30, padding: '0 10px', borderRadius: T.rPill,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        color: T.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .15s',
        flexShrink: 0, ...style,
      }}
    >
      <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}</span>
      <span style={{ fontSize: 11 }}>{language.toUpperCase()}</span>
    </button>
  )

  const renderScreen = () => {
    if (loading) {
      return <ParentCenterSkeleton />
    }
    switch (route) {
      case 'dashboard':
        return <Dashboard children={children} activity={activity} pending={pending}
          onAction={openAction} onApprove={handleApprove} onDecline={handleDecline} onOpenChild={onOpenChild}
          onFillDay={openFillDay}/>
      case 'children':
        return <ChildrenScreen children={children} onOpenChild={onOpenChild}/>
      case 'tasks':
        return <TasksScreen/>
      case 'shop':
        return <ShopScreen pending={pending} onApprove={handleApprove} onDecline={handleDecline} children={children}/>
      case 'analytics':
        return <AnalyticsScreen children={children} activity={activity}/>
      case 'settings':
        return <SettingsScreen allChildren={children} notify={(msg, tone) => notify(msg, tone as any)} onNavigate={setRoute}/>
      case 'child':
        return activeChild
          ? <ChildProfile child={activeChild} onBack={backFromChild} onAction={openAction}/>
          : null
      case 'audit':
        return <AuditScreen familyId={familyId ?? ''} children={children}/>
      case 'wallets':
        return <WalletsScreen children={children}/>
      case 'expenses':
        return <div style={{ padding: 16 }}><ExpensesPanel kids={children.map(c => ({ id: c.id, name: c.name }))}/></div>
      default:
        return null
    }
  }

  if (isDesktop) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'grid',
        gridTemplateColumns: '240px 1fr 320px',
        background: T.bg0, fontFamily: T.fBody, color: T.text, overflow: 'hidden',
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          input[type="number"] { -moz-appearance: textfield; }
        `}}/>

        {/* ── SIDEBAR ── */}
        <aside style={{
          background: T.bg1, borderRight: `1px solid ${T.cardBorder}`,
          display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
        }}>
          {/* Logo / wordmark */}
          <div style={{
            padding: '20px 18px 16px', borderBottom: `1px solid ${T.cardBorder}`, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 11,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: T.fHead,
              boxShadow: `0 4px 14px ${T.indigo}55`,
            }}>P</div>
            <div>
              <div style={{ fontFamily: T.fHead, fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>Parent Center</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{children.length} · synced</div>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
            {navItems.map(n => {
              const active = route === n.id || (n.id === 'children' && route === 'child')
              return (
                <button key={n.id} onClick={() => setRoute(n.id)} style={{
                  width: '100%', height: 38, padding: '0 12px',
                  background: active ? T.indigoSoft : 'transparent',
                  border: `1px solid ${active ? T.indigo + '44' : 'transparent'}`,
                  borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10,
                  color: active ? T.indigoHi : T.textDim, cursor: 'pointer',
                  fontFamily: T.fBody, fontSize: 13, fontWeight: 600, textAlign: 'left',
                  transition: 'all .12s', position: 'relative',
                }}>
                  {active && (
                    <span style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 16, background: T.indigoHi, borderRadius: '0 3px 3px 0',
                      boxShadow: `0 0 8px ${T.indigo}88`,
                    }}/>
                  )}
                  <Icon name={n.icon} size={15} stroke={active ? 2 : 1.6}/>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {n.id === 'shop' && pendingCount > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, padding: '0 5px',
                      background: T.danger, borderRadius: T.rPill,
                      color: '#fff', fontSize: 10, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: T.fMono,
                    }}>{pendingCount}</span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Settings + lang at bottom */}
          <div style={{ padding: '10px 10px 16px', borderTop: `1px solid ${T.cardBorder}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setRoute('settings')} style={{
              width: '100%', height: 38, padding: '0 12px',
              background: route === 'settings' ? T.indigoSoft : 'transparent',
              border: `1px solid ${route === 'settings' ? T.indigo + '44' : 'transparent'}`,
              borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10,
              color: route === 'settings' ? T.indigoHi : T.textDim,
              cursor: 'pointer', fontFamily: T.fBody, fontSize: 13, fontWeight: 600,
              transition: 'all .12s',
            }}>
              <Icon name="settings" size={15}/>
              <span style={{ flex: 1 }}>{t('nav.settings')}</span>
            </button>
            <LangToggle style={{ width: '100%', justifyContent: 'center' }}/>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{
          display: 'flex', flexDirection: 'column',
          height: '100vh', overflow: 'hidden', background: T.bg0,
        }}>
          {/* Desktop top bar */}
          <div style={{
            flexShrink: 0, height: 54,
            display: 'flex', alignItems: 'center', padding: '0 24px',
            background: T.bg1, borderBottom: `1px solid ${T.cardBorder}`, gap: 12,
          }}>
            <div style={{ flex: 1, fontFamily: T.fHead, fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>
              {navItems.find(n => n.id === route || (n.id === 'children' && route === 'child'))?.label ?? 'Parent Center'}
            </div>
            {pendingCount > 0 && (
              <div style={{
                height: 28, padding: '0 10px',
                background: T.dangerSoft, border: `1px solid ${T.danger}44`,
                borderRadius: T.rPill, display: 'inline-flex', alignItems: 'center', gap: 6,
                color: T.danger, fontSize: 11, fontWeight: 700, fontFamily: T.fMono,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.danger }}/>
                {pendingCount} {t('dashboard.pending')}
              </div>
            )}
            <LangToggle/>
            <div style={{
              height: 28, padding: '0 12px',
              background: `${T.indigo}22`,
              border: `1px solid ${T.indigo}44`,
              borderRadius: T.rPill, display: 'inline-flex', alignItems: 'center', gap: 7,
              color: T.indigoHi, fontSize: 11, fontWeight: 700, fontFamily: T.fBody,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#fff',
              }}>P</div>
              Parent
            </div>
          </div>

          {/* Screen content */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            {loading ? <ParentCenterSkeleton /> : renderScreen()}
          </div>
        </main>

        {/* ── CHAT PANEL (always visible column) ── */}
        <ChatPanel
          open={true} onClose={() => {}} desktop={true}
          children={children} pending={pending}
          onApprove={handleApprove} onDecline={handleDecline}
          familyId={familyId ?? ''}
        />

        <ActionModal open={modal.open} child={modal.child} action={modal.action} onClose={closeAction} onConfirm={confirmAction}/>
        <DailyModal isOpen={dailyModal.open} onClose={closeFillDay} childId={dailyModal.childId} date={localDateString()} onSave={() => { closeFillDay(); setRefreshKey(k => k + 1) }}/>
        <Toast toast={toast}/>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg0, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: T.fBody, color: T.text,
      maxWidth: 480, margin: '0 auto',
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}} />

      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: T.bg1, borderBottom: `1px solid ${T.cardBorder}`, zIndex: 50,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff',
          boxShadow: `0 3px 12px ${T.indigo}55`, flexShrink: 0,
        }}>P</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fHead, fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>Parent Center</div>
          <div style={{ fontSize: 10, color: T.muted }}>{t('dashboard.familyCount', { count: String(children.length) })}</div>
        </div>
        <LangToggle/>
        <button onClick={() => setRoute('settings')} style={{
          width: 32, height: 32, borderRadius: '50%',
          background: T.cardHi, border: `1px solid ${T.cardBorder}`,
          color: T.text, cursor: 'pointer', position: 'relative',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="settings" size={15}/>
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
        familyId={familyId ?? ''}
      />

      <ActionModal
        open={modal.open} child={modal.child} action={modal.action}
        onClose={closeAction} onConfirm={confirmAction}
      />

      <DailyModal isOpen={dailyModal.open} onClose={closeFillDay} childId={dailyModal.childId} date={localDateString()} onSave={() => { closeFillDay(); setRefreshKey(k => k + 1) }}/>

      <Toast toast={toast}/>
    </div>
  )
}
