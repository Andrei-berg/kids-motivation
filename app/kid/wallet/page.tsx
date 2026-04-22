'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { getWallet, getTransactions } from '@/lib/repositories/wallet.repo'
import { api } from '@/lib/api'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import type { Wallet, WalletTransaction } from '@/lib/models/wallet.types'
import { T } from '@/components/kid/design/tokens'
import { Coin, CoinPill, AnimatedNum, SectionHeader, KMButton } from '@/components/kid/design/atoms'

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[200, 72, 120, 120, 200].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KidWalletPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [weekScore, setWeekScore] = useState<number>(0)
  const [goals, setGoals] = useState<any[]>([])

  const loadData = useCallback(async () => {
    if (!activeMemberId) { setLoading(false); return }
    setLoading(true)
    try {
      const today = normalizeDate(new Date())
      const weekStart = getWeekRange(today).start
      const [walletData, txData, weekData, goalsData] = await Promise.all([
        getWallet(activeMemberId),
        getTransactions(activeMemberId, 20),
        api.getWeekScore(activeMemberId, weekStart),
        api.getGoals(activeMemberId),
      ])
      setWallet(walletData)
      setTransactions(txData)
      setWeekScore(weekData?.total ?? 0)
      setGoals(goalsData?.all ?? [])
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

  return (
    <div style={{ paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
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
              Твой баланс
            </div>
            {weekScore > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                background: `${T.sun}22`, border: `1px solid ${T.sun}55`,
                fontFamily: T.fBody, fontSize: 11, fontWeight: 700, color: T.sun,
              }}>+{weekScore} на этой неделе</div>
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
            ≈ {(coins * 1.5).toLocaleString('ru-RU')} ₸ эквивалент
          </div>

          <div style={{
            marginTop: 16, display: 'flex', gap: 8, position: 'relative',
            background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 3,
          }}>
            <div style={{ flex: 1, padding: '10px 12px', borderRadius: 13, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontFamily: T.fBody, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>БАЛАНС</div>
              <div style={{ fontFamily: T.fNum, fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>{coins.toLocaleString('ru-RU')}</div>
            </div>
            <div style={{ flex: 1, padding: '10px 12px' }}>
              <div style={{ fontFamily: T.fBody, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>НАКОПЛЕНО</div>
              <div style={{ fontFamily: T.fNum, fontSize: 18, fontWeight: 800, color: T.sun, marginTop: 2 }}>{saved.toLocaleString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Goals ════════════════════════════════════════════════════════════ */}
      {goals.length > 0 && (
        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>Цели сбережений</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.map((g: any) => <GoalCard key={g.id} g={g} coins={coins}/>)}
          </div>
        </div>
      )}

      {/* ═══ Transactions ═════════════════════════════════════════════════════ */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>История</h3>
          <span style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 600 }}>Последние</span>
        </div>
        {transactions.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 22, padding: 24, textAlign: 'center',
            border: `1.5px solid ${T.line}`,
          }}>
            <div style={{ fontSize: 32 }}>💸</div>
            <div style={{ fontFamily: T.fDisp, fontSize: 15, fontWeight: 800, color: T.ink3, marginTop: 8 }}>
              Транзакций пока нет
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 22, padding: 4, border: `1.5px solid ${T.line}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            {transactions.slice(0, 15).map((x, i) => (
              <TxnRow key={x.id} x={x} isLast={i === Math.min(transactions.length, 15) - 1}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ g, coins }: { g: any; coins: number }) {
  const target = g.target_coins ?? g.target ?? 0
  const current = g.saved_coins ?? g.current ?? 0
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const color = T.plum

  return (
    <div style={{
      background: '#fff', borderRadius: 22, padding: 16,
      border: `1.5px solid ${T.line}`, boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: color, opacity: 0.06 }}/>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: color + '18', border: `1.5px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
        }}>🎯</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: T.ink, lineHeight: 1.2 }}>{g.name ?? g.title ?? 'Цель'}</div>
          {g.deadline && (
            <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600, marginTop: 2 }}>До: {g.deadline}</div>
          )}
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 999, background: color, color: '#fff',
          fontFamily: T.fNum, fontSize: 13, fontWeight: 800, boxShadow: `0 3px 10px ${color}55`,
        }}>{pct}%</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ height: 10, background: T.lineSoft, borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            borderRadius: 999,
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent 60%)', borderRadius: 999 }}/>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontFamily: T.fNum, fontSize: 13, fontWeight: 800, color: T.ink }}>
            {current.toLocaleString('ru-RU')}
            <span style={{ color: T.ink3, fontWeight: 600 }}> / {target.toLocaleString('ru-RU')}</span>
          </span>
          {target > current && (
            <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700 }}>
              ещё {(target - current).toLocaleString('ru-RU')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Transaction row ─────────────────────────────────────────────────────────
function TxnRow({ x, isLast }: { x: WalletTransaction; isLast: boolean }) {
  const isIn = x.coins_change > 0
  const col = isIn ? T.teal : T.coral
  const label = x.description ?? (isIn ? 'Начислено' : 'Списано')
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
