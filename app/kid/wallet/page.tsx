'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getWallet, getTransactions } from '@/lib/repositories/wallet.repo'
import { api } from '@/lib/api'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import type { Wallet, WalletTransaction } from '@/lib/models/wallet.types'
import { T } from '@/components/kid/design/tokens'
import { Coin, CoinPill, AnimatedNum, SectionHeader, KMButton } from '@/components/kid/design/atoms'
import GoalsPanel from '@/components/kid/GoalsPanel'
import { useT } from '@/lib/i18n'

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
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [weekScore, setWeekScore] = useState<number>(0)
  const isDesktop = useDesktop()

  const loadData = useCallback(async () => {
    if (!activeMemberId) { setLoading(false); return }
    setLoading(true)
    try {
      const today = normalizeDate(new Date())
      const weekStart = getWeekRange(today).start
      const [walletData, txData, weekData] = await Promise.all([
        getWallet(activeMemberId),
        getTransactions(activeMemberId, 20),
        api.getWeekScore(activeMemberId, weekStart),
      ])
      setWallet(walletData)
      setTransactions(txData)
      setWeekScore(weekData?.total ?? 0)
    } catch (err) {
      console.error('KidWalletPage error', err)
    } finally {
      setLoading(false)
    }
  }, [activeMemberId])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingSkeleton/>

  const coins = wallet?.coins ?? 0
  const saved = wallet?.total_earned_coins ?? 0

  const QUICK_ACTIONS = [
    { icon: '💸', label: t('kidWallet.quickActions.save'),  href: '/kid/wallet#goals' },
    { icon: '🎁', label: t('kidWallet.quickActions.spend'), href: '/kid/shop' },
    { icon: '📤', label: t('kidWallet.quickActions.gift'),  href: '/kid/wallet#gift' },
    { icon: '📊', label: t('kidWallet.quickActions.stats'), href: '/kid/analytics' },
  ]

  return (
    <div style={isDesktop ? {} : { paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      {/* ═══ Balance hero ═════════════════════════════════════════════════════ */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          borderRadius: 28, padding: '22px 22px 20px',
          background: `linear-gradient(160deg, #1A1423 0%, #3D2B5C 65%, #6C5CE7 100%)`,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(108,92,231,0.3)',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -20, width: 160, height: 160, borderRadius: '50%',
            background: `radial-gradient(${T.sun}60, transparent 65%)`, filter: 'blur(20px)' }}/>
          <div style={{ position: 'absolute', bottom: -80, left: -20, width: 180, height: 180, borderRadius: '50%',
            background: `radial-gradient(${T.coral}50, transparent 65%)`, filter: 'blur(20px)' }}/>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div style={{ fontFamily: T.fBody, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('kidWallet.balance')}
            </div>
            {weekScore > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                background: `${T.sun}22`, border: `1px solid ${T.sun}55`,
                fontFamily: T.fBody, fontSize: 11, fontWeight: 700, color: T.sun,
              }}>{t('kidWallet.earnedThisWeek', { amount: weekScore })}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10, position: 'relative' }}>
            <svg width="42" height="42" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="10" fill={T.sun} stroke={T.sunDeep} strokeWidth="1.2"/>
              <circle cx="11" cy="11" r="7" fill="none" stroke={T.sunDeep} strokeWidth="0.8" opacity="0.5"/>
              <text x="11" y="14.5" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily={T.fDisp} fill={T.ink}>K</text>
            </svg>
            <div style={{ fontFamily: T.fNum, fontSize: 52, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>
              <AnimatedNum value={coins}/>
            </div>
          </div>
          <div style={{ fontFamily: T.fBody, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontWeight: 500, position: 'relative' }}>
            {t('kidWallet.equivalent', { amount: (coins * 1.5).toLocaleString('ru-RU') })}
          </div>

          <div style={{
            marginTop: 16, display: 'flex', gap: 8, position: 'relative',
            background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 3,
          }}>
            <div style={{ flex: 1, padding: '10px 12px', borderRadius: 13, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontFamily: T.fBody, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{t('kidWallet.balanceLabel')}</div>
              <div style={{ fontFamily: T.fNum, fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>{coins.toLocaleString('ru-RU')}</div>
            </div>
            <div style={{ flex: 1, padding: '10px 12px' }}>
              <div style={{ fontFamily: T.fBody, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{t('kidWallet.savedLabel')}</div>
              <div style={{ fontFamily: T.fNum, fontSize: 18, fontWeight: 800, color: T.sun, marginTop: 2 }}>{saved.toLocaleString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Quick Actions ════════════════════════════════════════════════════ */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => router.push(a.href)} style={{
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
                background: '#fff', borderRadius: 22, padding: 24, textAlign: 'center',
                border: `1.5px solid ${T.line}`,
              }}>
                <div style={{ fontSize: 32 }}>💸</div>
                <div style={{ fontFamily: T.fDisp, fontSize: 15, fontWeight: 800, color: T.ink3, marginTop: 8 }}>
                  {t('kidWallet.noTransactions')}
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
        <div style={isDesktop ? { position: 'sticky', top: 24 } : {}}>
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
        <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, marginTop: 1 }}>{time}</div>
      </div>
      <div style={{ fontFamily: T.fNum, fontSize: 15, fontWeight: 800, color: isIn ? T.teal : T.coral }}>
        {isIn ? '+' : ''}{x.coins_change}
      </div>
    </div>
  )
}
