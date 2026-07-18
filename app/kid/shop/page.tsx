'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getWallet, getRewards, getPurchases } from '@/lib/repositories/wallet.repo'
import { requestPurchase } from '@/app/kid/shop/actions'
import { api } from '@/lib/api'
import type { Wallet, Reward, RewardPurchase } from '@/lib/models/wallet.types'
import type { Child } from '@/lib/models/child.types'
import { base, paper } from '@/lib/design/tokens'
import { Amount, StatusChip, Tabs, Stamp } from '@/components/design/atoms'
import ScreenHeader from '@/components/kid/design/ScreenHeader'
import { useDesktop } from '@/lib/hooks/useDesktop'
import { useT } from '@/lib/i18n'

function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[80, 60, 320, 120].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

export default function KidShopPage() {
  const t = useT()
  const isDesktop = useDesktop()
  const { activeMemberId } = useAppStore()
  const [tab, setTab] = useState<'real' | 'virtual'>('real')
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [purchases, setPurchases] = useState<RewardPurchase[]>([])
  const [pending, setPending] = useState<Reward | null>(null)
  const [approving, setApproving] = useState<Reward | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (!activeMemberId) return
    const load = async () => {
      setLoading(true)
      try {
        const [w, r, p, c] = await Promise.all([
          getWallet(activeMemberId),
          getRewards({ activeOnly: true }),
          getPurchases(activeMemberId),
          api.getChild(activeMemberId).catch(() => null),
        ])
        setWallet(w)
        setRewards(r.filter(x => !x.for_child || x.for_child === activeMemberId))
        setPurchases(p)
        setChild(c)
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [activeMemberId])

  if (loading) return <LoadingSkeleton/>

  const coins = wallet?.coins ?? 0

  const VIRTUAL_ITEMS = [
    { id: 'v1', icon: '🚀', title: 'Astronaut Suit',  price_coins: 400, tag: 'Avatar' },
    { id: 'v2', icon: '🌈', title: 'Neon Theme',      price_coins: 250, tag: 'Theme'  },
    { id: 'v3', icon: '🐉', title: 'Dragon Pet',      price_coins: 600, tag: 'Pet'    },
    { id: 'v4', icon: '🤖', title: 'Robot Avatar',    price_coins: 350, tag: 'Avatar' },
    { id: 'v5', icon: '🌙', title: 'Dark Theme',      price_coins: 200, tag: 'Theme'  },
    { id: 'v6', icon: '🦄', title: 'Unicorn Pet',     price_coins: 500, tag: 'Pet'    },
  ]

  async function handleConfirm() {
    if (!activeMemberId || !pending) return
    setPurchasing(true)
    try {
      await requestPurchase(activeMemberId, pending.id)
      const [w, p] = await Promise.all([getWallet(activeMemberId), getPurchases(activeMemberId)])
      setWallet(w); setPurchases(p)
      setApproving(pending)
      setPending(null)
    } catch (err: any) { showToast(err?.message ?? t('common.error')) }
    finally { setPurchasing(false) }
  }

  return (
    <div style={isDesktop ? { paddingBottom: 110, padding: '0 32px 32px' } : { paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: 16, right: 16, zIndex: 60, background: paper.ink, color: '#fff', padding: '12px 16px', borderRadius: 14, fontFamily: base.fontBody, fontWeight: 600, fontSize: 14, textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s' }}>
          {toast}
        </div>
      )}

      {/* ═══ Header («сберкнижка», D-13) ══════════════════════════════════════ */}
      <ScreenHeader title={t('kidHeader.shop')} coins={coins} name={child?.name ?? ''}/>

      {/* ═══ Tabs (shared atom) ═══════════════════════════════════════════════ */}
      <div style={{ padding: '8px 16px 0' }}>
        <Tabs
          theme="paper"
          tabs={[
            { id: 'real', label: t('kidShop.rewardsTab'), icon: '🎁' },
            { id: 'virtual', label: t('kidShop.virtualTab'), icon: '✨' },
          ]}
          value={tab}
          onChange={(id) => setTab(id as 'real' | 'virtual')}
        />
      </div>

      {/* ═══ Rewards grid ═════════════════════════════════════════════════════ */}
      <div style={{ padding: '16px 16px 0' }}>
        <h3 style={{ margin: '0 0 12px', fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700, color: paper.ink, lineHeight: 1.2 }}>{tab === 'real' ? t('kidShop.realRewards') : t('kidShop.virtualItems')}</h3>
        {tab === 'virtual' ? (
          <>
            <div style={{ fontFamily: base.fontBody, fontSize: 12, color: paper.ink2, marginBottom: 12, lineHeight: 1.4 }}>
              {t('kidShop.virtualComingSoon')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 10 }}>
              {VIRTUAL_ITEMS.map(item => (
                <div key={item.id} style={{
                  background: paper.card, borderRadius: 16, padding: 12,
                  border: `1px solid ${paper.line}`,
                  display: 'flex', flexDirection: 'column', opacity: 0.7,
                }}>
                  <div style={{ height: 88, borderRadius: 12, background: paper.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, position: 'relative' }}>
                    {item.icon}
                    <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 7px', borderRadius: 999, background: paper.card, border: `1px solid ${paper.line}`, fontFamily: base.fontBody, fontSize: 9, fontWeight: 600, color: paper.ink2 }}>{item.tag}</div>
                  </div>
                  <div style={{ fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink, marginTop: 10, lineHeight: 1.3, minHeight: 36 }}>{item.title}</div>
                  <div style={{ marginTop: 8 }}><Amount value={item.price_coins} theme="paper" money size="md"/></div>
                  <button disabled style={{ marginTop: 8, minHeight: 44, borderRadius: 12, border: 'none', background: paper.lineSoft, color: paper.ink3, fontFamily: base.fontBody, fontSize: 13, fontWeight: 600, cursor: 'not-allowed' }}>
                    {t('kidShop.comingSoon')}
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : rewards.length === 0 ? (
          <div style={{ background: paper.card, borderRadius: 16, padding: 40, textAlign: 'center', border: `1px solid ${paper.line}` }}>
            <div style={{ fontSize: 40 }}>🛍️</div>
            <div style={{ fontFamily: base.fontDisplay, fontSize: 16, fontWeight: 700, color: paper.ink2, marginTop: 12 }}>
              {t('kidShop.shopEmpty')}
            </div>
            <div style={{ fontFamily: base.fontBody, fontSize: 13, color: paper.ink3, marginTop: 4 }}>
              {t('kidShop.askParents')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 10 }}>
            {rewards.map(item => {
              const price = item.price_coins ?? 0
              const canAfford = coins >= price
              return (
                <div key={item.id} style={{
                  background: paper.card, borderRadius: 16, padding: 12,
                  border: `1px solid ${paper.line}`,
                  display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    height: 88, borderRadius: 12,
                    background: paper.lineSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 44, border: `1px solid ${paper.line}`,
                  }}>{item.icon || '🎁'}</div>
                  <div style={{ fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink, marginTop: 10, lineHeight: 1.3, minHeight: 36 }}>
                    {item.title}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Amount value={price} theme="paper" money size="md"/>
                  </div>
                  <button onClick={canAfford ? () => setPending(item) : undefined} disabled={!canAfford} style={{
                    marginTop: 8, minHeight: 44, borderRadius: 12, border: 'none',
                    background: canAfford ? paper.accent : paper.lineSoft,
                    color: canAfford ? '#fff' : paper.ink3,
                    fontFamily: base.fontBody, fontSize: 13, fontWeight: 700,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}>
                    {canAfford ? t('kidShop.getButton') : t('kidShop.moreNeeded', { amount: price - coins })}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ Featured banner (real tab only) ════════════════════════════════ */}
      {tab === 'real' && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{
            borderRadius: 16, padding: '18px 20px',
            background: paper.card, border: `1px solid ${paper.line}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 44 }}>🌟</div>
            <div>
              <div style={{ fontFamily: base.fontBody, fontSize: 10, color: paper.ink3, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{t('kidShop.earnMore')}</div>
              <div style={{ fontFamily: base.fontDisplay, fontSize: 16, fontWeight: 700, color: paper.ink, lineHeight: 1.2, marginTop: 2 }}>{t('kidShop.fillEachDay')}</div>
              <div style={{ fontFamily: base.fontBody, fontSize: 12, color: paper.ink2, marginTop: 4 }}>{t('kidShop.earnAndSpend')}</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Recent purchases ═════════════════════════════════════════════════ */}
      {purchases.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <h3 style={{ margin: '0 0 12px', fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700, color: paper.ink, lineHeight: 1.2 }}>{t('kidShop.myRequests')}</h3>
          <div style={{ background: paper.card, borderRadius: 16, border: `1px solid ${paper.line}`, overflow: 'hidden' }}>
            {purchases.slice(0, 5).map((p, i) => {
              const s = p.status ?? (p.fulfilled ? 'delivered' : 'pending')
              const statusTone = s === 'rejected' ? 'danger' as const : s === 'pending' ? 'warning' as const : 'success' as const
              const statusLabel = s === 'pending' ? t('kidShop.statusPending') : s === 'approved' ? t('kidShop.statusApproved') : s === 'rejected' ? t('kidShop.statusRejected') : t('kidShop.statusDelivered')
              return (
                <div key={p.id} style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i < Math.min(purchases.length, 5) - 1 ? `1px solid ${paper.lineSoft}` : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink }}>
                      {(p as any).reward_title ?? t('kidShop.realRewards')}
                    </div>
                    <div style={{ fontFamily: base.fontBody, fontSize: 11.5, color: paper.ink3, marginTop: 1 }}>
                      {new Date(p.purchased_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <StatusChip tone={statusTone} theme="paper">{statusLabel}</StatusChip>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Confirm sheet ════════════════════════════════════════════════════ */}
      {pending && (
        <div onClick={() => setPending(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(36,30,56,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: paper.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '20px 20px 30px', animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.1)' }}>
            <div style={{ width: 40, height: 4, background: paper.line, borderRadius: 999, margin: '0 auto 18px' }}/>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 74, height: 74, borderRadius: 16, background: paper.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                {pending.icon || '🎁'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: base.fontBody, fontSize: 11, color: paper.ink3, fontWeight: 600, letterSpacing: 1 }}>{t('kidShopConfirm.title')}</div>
                <div style={{ fontFamily: base.fontDisplay, fontSize: 20, fontWeight: 700, color: paper.ink, lineHeight: 1.15, marginTop: 2 }}>{pending.title}</div>
                <div style={{ marginTop: 6 }}><Amount value={pending.price_coins ?? 0} theme="paper" money size="md"/></div>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: paper.lineSoft, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 22 }}>🛡️</div>
              <div style={{ fontFamily: base.fontBody, fontSize: 12, color: paper.ink2, fontWeight: 500, lineHeight: 1.4 }}>
                {t('kidShopConfirm.parentNote')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setPending(null)} style={{
                flex: 1, minHeight: 44, borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${paper.line}`, background: paper.card, color: paper.ink,
                fontFamily: base.fontBody, fontSize: 14, fontWeight: 600,
              }}>
                {t('kidShopConfirm.cancel')}
              </button>
              <button onClick={handleConfirm} disabled={purchasing} style={{
                flex: 1, minHeight: 44, borderRadius: 12, cursor: purchasing ? 'default' : 'pointer',
                border: 'none', background: paper.accent, color: '#fff',
                fontFamily: base.fontBody, fontSize: 14, fontWeight: 700,
                opacity: purchasing ? 0.6 : 1,
              }}>
                {purchasing ? t('kidShopConfirm.sending') : t('kidShopConfirm.sendRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Approval animation ═══════════════════════════════════════════════ */}
      {approving && <ApprovalSheet item={approving} onClose={() => setApproving(null)}/>}
    </div>
  )
}

function ApprovalSheet({ item, onClose }: { item: Reward; onClose: () => void }) {
  const t = useT()
  const [stage, setStage] = useState<'sent' | 'seen' | 'approved'>('sent')
  useEffect(() => {
    const t1 = setTimeout(() => setStage('seen'), 1600)
    const t2 = setTimeout(() => setStage('approved'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const steps = [
    { k: 'sent', l: t('kidShopApproval.stepSent'), ic: '📤' },
    { k: 'seen', l: t('kidShopApproval.stepSeen'), ic: '📱' },
    { k: 'approved', l: t('kidShopApproval.stepApproved'), ic: '🎉' },
  ]
  const curIdx = steps.findIndex(s => s.k === stage)
  return (
    <div onClick={stage === 'approved' ? onClose : undefined} style={{ position: 'fixed', inset: 0, background: 'rgba(36,30,56,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: paper.card, borderRadius: 20, padding: 24, animation: 'popIn 0.35s cubic-bezier(.2,.9,.3,1.3)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: stage === 'approved' ? paper.success : paper.lineSoft, border: `1.5px solid ${stage === 'approved' ? paper.success : paper.line}`, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
          {stage === 'approved' ? '🎁' : '💸'}
        </div>
        <div style={{ fontFamily: base.fontDisplay, fontSize: 20, fontWeight: 700, color: paper.ink, textAlign: 'center', marginTop: 14 }}>
          {stage === 'approved' ? t('kidShopApproval.done') : t('kidShopApproval.waiting')}
        </div>
        {/* D-20: approved → Stamp ceremony («ПОЛУЧЕНО», −8° tilt, 450ms), no confetti */}
        {stage === 'approved' && (
          <Stamp trigger="approved" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <div aria-hidden style={{
              transform: 'rotate(-8deg)',
              border: `3px solid ${paper.successText}`, color: paper.successText,
              borderRadius: 8, padding: '4px 16px',
              fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700,
              letterSpacing: 2, textTransform: 'uppercase',
            }}>
              {t('stamp.received')}
            </div>
          </Stamp>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          {steps.map((s, i) => {
            const done = i <= curIdx
            return (
              <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: done ? `${paper.success}14` : paper.lineSoft, border: `1.5px solid ${done ? `${paper.success}55` : paper.line}`, transition: 'all 0.4s' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? paper.success : paper.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>
                  {done ? '✓' : s.ic}
                </div>
                <span style={{ flex: 1, fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: done ? paper.ink : paper.ink3 }}>{s.l}</span>
              </div>
            )
          })}
        </div>
        {stage === 'approved' && (
          <div style={{ marginTop: 18 }}>
            <button onClick={onClose} style={{
              width: '100%', minHeight: 44, borderRadius: 12, cursor: 'pointer',
              border: 'none', background: paper.accent, color: '#fff',
              fontFamily: base.fontBody, fontSize: 14, fontWeight: 700,
            }}>
              {t('kidShopApproval.greatBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
