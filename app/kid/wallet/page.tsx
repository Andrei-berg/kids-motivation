'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getWallet, getTransactions } from '@/lib/repositories/wallet.repo'
import { api } from '@/lib/api'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import type { Wallet, WalletTransaction } from '@/lib/models/wallet.types'
import type { Child } from '@/lib/models/child.types'
import { T } from '@/components/kid/design/tokens'
import { base, paper } from '@/lib/design/tokens'
import { LedgerRow, Amount, useCountUp } from '@/components/design/atoms'
import ScreenHeader from '@/components/kid/design/ScreenHeader'
import { useDesktop } from '@/lib/hooks/useDesktop'
import GoalsPanel from '@/components/kid/GoalsPanel'
import { useT } from '@/lib/i18n'

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Wallet hero: balance display */}
      <div className="kid-skeleton" style={{ height: 180, borderRadius: 24 }}/>
      {/* Quick actions row */}
      <div className="kid-skeleton" style={{ height: 64, borderRadius: 20 }}/>
      {/* Week summary */}
      <div className="kid-skeleton" style={{ height: 120, borderRadius: 20 }}/>
      {/* Transaction list */}
      <div className="kid-skeleton" style={{ height: 200, borderRadius: 20 }}/>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const listV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const itemV = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

export default function KidWalletPage() {
  const t = useT()
  const router = useRouter()
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [weekScore, setWeekScore] = useState<number>(0)
  const isDesktop = useDesktop()

  const loadData = useCallback(async () => {
    if (!activeMemberId) { setLoading(false); return }
    setLoading(true)
    try {
      const today = normalizeDate(new Date())
      const weekStart = getWeekRange(today).start
      const [walletData, txData, weekData, childData] = await Promise.all([
        getWallet(activeMemberId),
        getTransactions(activeMemberId, 20),
        api.getWeekScore(activeMemberId, weekStart),
        api.getChild(activeMemberId).catch(() => null),
      ])
      setWallet(walletData)
      setTransactions(txData)
      setWeekScore(weekData?.total ?? 0)
      setChild(childData)
    } catch (err) {
      console.error('KidWalletPage error', err)
    } finally {
      setLoading(false)
    }
  }, [activeMemberId])

  useEffect(() => { loadData() }, [loadData])

  const coins = wallet?.coins ?? 0
  // Hero count-up (D-16) — hook must run unconditionally, before the early return.
  const heroCoins = useCountUp(coins)

  if (loading) return <LoadingSkeleton/>

  // Weekly +earned / −spent summary (D-16). Earned reuses the existing
  // getWeekScore total; spent is derived from the already-loaded transactions
  // within the current week. Display-only — the balance stays authoritative
  // server-side (money tables are RLS SELECT-only).
  const weekStartMs = new Date(`${getWeekRange(normalizeDate(new Date())).start}T00:00:00`).getTime()
  const weekSpent = transactions.reduce((sum, x) => {
    if (x.coins_change >= 0 || !x.created_at) return sum
    return new Date(x.created_at).getTime() >= weekStartMs ? sum + Math.abs(x.coins_change) : sum
  }, 0)

  // WR-01: "gift" dropped until a P2P entry point exists; "stats" points at the
  // achievements screen (rating tab) — /kid/analytics does not exist.
  const QUICK_ACTIONS = [
    { icon: '💸', label: t('kidWallet.quickActions.save'),  href: '/kid/wallet#goals' },
    { icon: '🎁', label: t('kidWallet.quickActions.spend'), href: '/kid/shop' },
    { icon: '📊', label: t('kidWallet.quickActions.stats'), href: '/kid/achievements' },
  ]

  function handleQuickAction(href: string) {
    const hash = href.split('#')[1]
    if (hash) {
      // Same-page anchor — scroll directly (router.push to the same path
      // does not reliably re-trigger hash scrolling in the App Router).
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      router.push(href)
    }
  }

  return (
    <div style={isDesktop ? {} : { paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      <ScreenHeader title={t('kidHeader.wallet')} coins={coins} name={child?.name ?? ''}/>

      {/* ═══ Hero сберкнижка balance (D-16) ═══════════════════════════════════ */}
      <div style={{ padding: '4px 16px 0' }}>
        <div style={{
          background: paper.card, borderRadius: 20, padding: '24px 20px',
          border: `1px solid ${paper.line}`,
        }}>
          <div style={{
            fontFamily: base.fontBody, fontSize: 12, fontWeight: 600, color: paper.ink3,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {t('kidWallet.balance')}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <Amount value={heroCoins} theme="paper" money size="xl"/>
            <span style={{ fontSize: 20 }} aria-hidden>🪙</span>
          </div>
          {/* Weekly +earned / −spent line */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <Amount value={weekScore} theme="paper" money signed size="sm"/>
            <span style={{ fontFamily: base.fontBody, fontSize: 12, fontWeight: 500, color: paper.ink3 }}>/</span>
            <span style={{ whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: base.fontMono, fontSize: 13, fontWeight: 700, color: paper.ink2, marginRight: 1 }}>−</span>
              <Amount value={weekSpent} theme="paper" money={false} size="sm" color={paper.ink2}/>
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Quick Actions ════════════════════════════════════════════════════ */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => handleQuickAction(a.href)} style={{
              background: '#fff', borderRadius: 20, padding: '14px 6px 12px',
              border: `1.5px solid ${T.line}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 26 }}>{a.icon}</span>
              <span style={{ fontFamily: T.fDisp, fontSize: 11, fontWeight: 800, color: T.ink }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 2-column below on desktop ════════════════════════════════════════ */}
      <div style={isDesktop ? {
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 24,
        padding: '24px 16px 32px',
        alignItems: 'start',
      } : {}}>

        {/* LEFT: transaction list */}
        <div>
          {/* ═══ Transactions ═════════════════════════════════════════════════════ */}
          <div style={{ padding: isDesktop ? '0' : '24px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>{t('kidWallet.history')}</h3>
              <span style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 600 }}>{t('kidWallet.lastTransactions')}</span>
            </div>
            {transactions.length === 0 ? (
              <div style={{
                background: paper.card, borderRadius: 20, padding: '28px 20px', textAlign: 'center',
                border: `1px solid ${paper.line}`,
              }}>
                <div style={{ fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700, color: paper.ink }}>
                  {t('wallet.emptyHeading')}
                </div>
                <div style={{ fontFamily: base.fontBody, fontSize: 14, fontWeight: 500, color: paper.ink2, marginTop: 6, lineHeight: 1.5 }}>
                  {t('wallet.emptyBody')}
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 22, padding: 4, border: `1.5px solid ${T.line}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <motion.div variants={listV} initial="hidden" animate="show">
                  {transactions.slice(0, 10).map((x, i) => (
                    <motion.div key={x.id} variants={itemV}>
                      <TxnRow x={x} isLast={i === Math.min(transactions.length, 10) - 1}/>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: goals — sticky on desktop */}
        <div id="goals" style={isDesktop ? { position: 'sticky', top: 24 } : {}}>
          {activeMemberId && <GoalsPanel childId={activeMemberId} coins={coins} />}
        </div>
      </div>

      {!isDesktop && <div style={{ height: 110 }}/>}
    </div>
  )
}

// ─── Transaction row ─────────────────────────────────────────────────────────
function TxnRow({ x, isLast }: { x: WalletTransaction; isLast: boolean }) {
  const t = useT()
  const isIn = x.coins_change > 0
  const col = isIn ? T.teal : T.coral
  const label = x.description ?? (isIn ? t('kidWallet.credited') : t('kidWallet.debited'))
  const time = x.created_at ? new Date(x.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
      borderBottom: isLast ? 'none' : `1px solid ${T.lineSoft}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11, background: col + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
      }}>{isIn ? '💰' : '🛍️'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <LedgerRow theme="paper" name={label} sub={time} amount={x.coins_change} tone={isIn ? 'earn' : 'spend'}/>
      </div>
    </div>
  )
}
