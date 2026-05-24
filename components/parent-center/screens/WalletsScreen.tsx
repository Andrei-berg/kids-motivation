'use client'

import { useState, useEffect } from 'react'
import { T } from '../tokens'
import { Card, Pill, Icon } from '../ui'
import type { ParentChild } from '../types'
import type { WalletTransaction, Wallet } from '@/lib/models/wallet.types'
import { getTransactions, getWallet } from '@/lib/repositories/wallet.repo'
import { useT } from '@/lib/i18n'

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.cardHi, flexShrink: 0 }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 13, width: '65%', borderRadius: 6, background: T.cardHi }}/>
        <div style={{ height: 11, width: '35%', borderRadius: 6, background: T.cardHi }}/>
      </div>
      <div style={{ width: 48, height: 18, borderRadius: 6, background: T.cardHi }}/>
    </div>
  )
}

export default function WalletsScreen({ children }: { children: ParentChild[] }) {
  const t = useT()
  const [who, setWho] = useState(children[0]?.id ?? '')
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [txns, setTxns] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!who) return
    setLoading(true)
    Promise.all([
      getWallet(who).catch(() => null),
      getTransactions(who, 40).catch(() => [] as WalletTransaction[]),
    ]).then(([w, t]) => {
      setWallet(w)
      setTxns(t)
      setLoading(false)
    })
  }, [who])

  const child = children.find(c => c.id === who)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
          {t('wallets.title')}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>{t('wallets.subtitle')}</p>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: 4, background: T.bg1, borderRadius: T.rPill, border: `1px solid ${T.cardBorder}` }}>
          {children.map(c => (
            <button key={c.id} onClick={() => setWho(c.id)} style={{
              flex: 1, height: 34, borderRadius: T.rPill,
              background: who === c.id ? T.cardHi : 'transparent',
              border: 'none', color: who === c.id ? T.text : T.muted,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontFamily: T.fBody, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
            }}>
              <span>{c.avatar}</span> {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Balance cards */}
      {loading ? (
        <>
          <div style={{ height: 100, borderRadius: T.rL, background: T.cardHi }}/>
          <Card pad={16}><SkeletonRow/><SkeletonRow/><SkeletonRow/></Card>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Card pad={16} glow>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                🪙 {t('wallets.coins')}
              </div>
              <div style={{ fontFamily: T.fMono, fontSize: 28, fontWeight: 700, color: T.indigoHi }}>
                {wallet?.coins.toLocaleString('ru-RU') ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                +{wallet?.total_earned_coins.toLocaleString('ru-RU') ?? 0} {t('wallets.earned')}
              </div>
            </Card>
            <Card pad={16}>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                💵 {t('wallets.money')}
              </div>
              <div style={{ fontFamily: T.fMono, fontSize: 28, fontWeight: 700, color: T.cyan }}>
                {Number(wallet?.money ?? 0).toLocaleString('ru-RU')}₽
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                {t('wallets.savedUp')}
              </div>
            </Card>
          </div>

          {/* Transaction list */}
          <Card pad={16}>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {t('wallets.transactions')}
            </div>
            {txns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: T.muted, fontSize: 13 }}>
                {t('wallets.noTransactions')}
              </div>
            ) : (
              txns.map((tx, i) => {
                const plus = tx.coins_change > 0
                return (
                  <div key={tx.id} style={{
                    display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0',
                    borderTop: i > 0 ? `1px solid ${T.cardBorder}` : 'none',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: plus ? T.successSoft : T.dangerSoft,
                      border: `1px solid ${plus ? T.success + '44' : T.danger + '44'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                      {tx.icon ?? (plus ? '💰' : '🛍️')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.fMono }}>
                        {formatDate(tx.created_at)}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: T.fMono, fontSize: 13, fontWeight: 700, flexShrink: 0,
                      color: plus ? T.success : T.danger,
                    }}>
                      {plus ? '+' : ''}{tx.coins_change}🪙
                    </div>
                  </div>
                )
              })
            )}
          </Card>
        </>
      )}
    </div>
  )
}
