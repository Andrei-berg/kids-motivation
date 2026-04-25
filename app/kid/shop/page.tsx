'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getWallet, getRewards, createPurchaseRequest, getPurchases } from '@/lib/repositories/wallet.repo'
import type { Wallet, Reward, RewardPurchase } from '@/lib/models/wallet.types'
import { T } from '@/components/kid/design/tokens'
import { AnimatedNum, CoinPill, KMButton } from '@/components/kid/design/atoms'

function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[80, 60, 320, 120].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

const VIRTUAL_ITEMS = [
  { id: 'v1', icon: '🚀', title: 'Костюм космонавта', price_coins: 400, tag: 'Аватар' },
  { id: 'v2', icon: '🌈', title: 'Неон тема', price_coins: 250, tag: 'Тема' },
  { id: 'v3', icon: '🐉', title: 'Дракон питомец', price_coins: 600, tag: 'Питомец' },
  { id: 'v4', icon: '🤖', title: 'Робот-аватар', price_coins: 350, tag: 'Аватар' },
  { id: 'v5', icon: '🌙', title: 'Тёмная тема', price_coins: 200, tag: 'Тема' },
  { id: 'v6', icon: '🦄', title: 'Единорог питомец', price_coins: 500, tag: 'Питомец' },
]

export default function KidShopPage() {
  const { activeMemberId } = useAppStore()
  const [tab, setTab] = useState<'real' | 'virtual'>('real')
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
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
        const [w, r, p] = await Promise.all([
          getWallet(activeMemberId),
          getRewards({ activeOnly: true }),
          getPurchases(activeMemberId),
        ])
        setWallet(w)
        setRewards(r.filter(x => !x.for_child || x.for_child === activeMemberId))
        setPurchases(p)
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [activeMemberId])

  if (loading) return <LoadingSkeleton/>

  const coins = wallet?.coins ?? 0

  async function handleConfirm() {
    if (!activeMemberId || !pending) return
    setPurchasing(true)
    try {
      await createPurchaseRequest(activeMemberId, pending.id)
      const [w, p] = await Promise.all([getWallet(activeMemberId), getPurchases(activeMemberId)])
      setWallet(w); setPurchases(p)
      setApproving(pending)
      setPending(null)
    } catch (err: any) { showToast(err?.message ?? 'Ошибка') }
    finally { setPurchasing(false) }
  }

  return (
    <div style={{ paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: 16, right: 16, zIndex: 60, background: T.teal, color: '#fff', padding: '12px 16px', borderRadius: 16, fontFamily: T.fDisp, fontWeight: 800, fontSize: 14, textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s' }}>
          {toast}
        </div>
      )}

      {/* ═══ Balance strip ════════════════════════════════════════════════════ */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.sun}, ${T.sunDeep})`,
          borderRadius: 22, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: `0 8px 20px ${T.sunDeep}55`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}/>
          <svg width="42" height="42" viewBox="0 0 22 22" style={{ position: 'relative' }}>
            <circle cx="11" cy="11" r="10" fill="#fff" stroke={T.ink} strokeWidth="1"/>
            <text x="11" y="14.5" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily={T.fDisp} fill={T.ink}>K</text>
          </svg>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink2, fontWeight: 700, letterSpacing: 1 }}>ТВОИ МОНЕТЫ</div>
            <div style={{ fontFamily: T.fNum, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -1, lineHeight: 1 }}>
              <AnimatedNum value={coins}/>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Tabs ═════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', background: T.lineSoft, borderRadius: 18, padding: 3, gap: 3 }}>
          {(['real', 'virtual'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, height: 40, borderRadius: 15, border: 'none', cursor: 'pointer',
              background: tab === t ? '#fff' : 'transparent',
              fontFamily: T.fDisp, fontSize: 13, fontWeight: 800,
              color: tab === t ? T.ink : T.ink3,
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
            }}>
              {t === 'real' ? '🎁 Реальные' : '✨ Виртуальные'}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Rewards grid ═════════════════════════════════════════════════════ */}
      <div style={{ padding: '16px 16px 0' }}>
        <h3 style={{ margin: '0 0 12px', fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>{tab === 'real' ? 'Награды' : 'Виртуальный магазин'}</h3>
        {tab === 'virtual' ? (
          <>
            <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginBottom: 12, lineHeight: 1.4 }}>
              Скоро! Виртуальные предметы пока в разработке. Копи монеты! 🚀
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {VIRTUAL_ITEMS.map(item => {
                const canAfford = coins >= item.price_coins
                return (
                  <div key={item.id} style={{
                    background: '#fff', borderRadius: 20, padding: 12,
                    border: `1.5px solid ${T.line}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', opacity: 0.7,
                  }}>
                    <div style={{ height: 88, borderRadius: 14, background: `linear-gradient(135deg, ${T.plum}30, ${T.plum}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, position: 'relative' }}>
                      {item.icon}
                      <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 7px', borderRadius: 999, background: T.plum + '20', fontFamily: T.fBody, fontSize: 9, fontWeight: 800, color: T.plum }}>{item.tag}</div>
                    </div>
                    <div style={{ fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, color: T.ink, marginTop: 10, lineHeight: 1.2, minHeight: 30 }}>{item.title}</div>
                    <div style={{ marginTop: 8 }}><CoinPill value={item.price_coins} size="sm"/></div>
                    <button disabled style={{ marginTop: 8, height: 34, borderRadius: 12, border: 'none', background: T.lineSoft, color: T.ink3, fontFamily: T.fDisp, fontSize: 12, fontWeight: 800, cursor: 'not-allowed' }}>
                      Скоро
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        ) : rewards.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 22, padding: 40, textAlign: 'center', border: `1.5px solid ${T.line}` }}>
            <div style={{ fontSize: 40 }}>🛍️</div>
            <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 800, color: T.ink3, marginTop: 12 }}>
              Магазин пока пуст
            </div>
            <div style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink3, marginTop: 4 }}>
              Попроси родителей добавить награды!
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {rewards.map(item => {
              const price = item.price_coins ?? 0
              const canAfford = coins >= price
              const color = T.plum
              return (
                <div key={item.id} style={{
                  background: '#fff', borderRadius: 20, padding: 12,
                  border: `1.5px solid ${T.line}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    height: 88, borderRadius: 14,
                    background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 44, border: `1px solid ${color}25`,
                  }}>{item.icon || '🎁'}</div>
                  <div style={{ fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, color: T.ink, marginTop: 10, lineHeight: 1.2, minHeight: 30 }}>
                    {item.title}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <CoinPill value={price} size="sm"/>
                  </div>
                  <button onClick={canAfford ? () => setPending(item) : undefined} disabled={!canAfford} style={{
                    marginTop: 8, height: 34, borderRadius: 12, border: 'none',
                    background: canAfford ? T.ink : T.lineSoft,
                    color: canAfford ? '#fff' : T.ink3,
                    fontFamily: T.fDisp, fontSize: 12, fontWeight: 800,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}>
                    {canAfford ? 'Получить →' : `ещё ${price - coins}`}
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
            borderRadius: 22, padding: '18px 20px',
            background: `linear-gradient(135deg, ${T.teal}, #3DB8B0)`,
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: `0 8px 20px ${T.teal}44`, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -10, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}/>
            <div style={{ fontSize: 44, position: 'relative' }}>🌟</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Заработай больше</div>
              <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginTop: 2 }}>Заполняй каждый день</div>
              <div style={{ fontFamily: T.fBody, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>Получай монеты и трать на награды!</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Recent purchases ═════════════════════════════════════════════════ */}
      {purchases.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <h3 style={{ margin: '0 0 12px', fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>Мои запросы</h3>
          <div style={{ background: '#fff', borderRadius: 22, border: `1.5px solid ${T.line}`, overflow: 'hidden' }}>
            {purchases.slice(0, 5).map((p, i) => {
              const s = p.status ?? (p.fulfilled ? 'delivered' : 'pending')
              const statusColor = s === 'approved' || s === 'delivered' ? T.teal : s === 'rejected' ? T.coral : T.sunDeep
              const statusLabel = s === 'pending' ? '⏳ Ожидает' : s === 'approved' ? '✅ Одобрено' : s === 'rejected' ? '❌ Отклонено' : '🎉 Выдано'
              return (
                <div key={p.id} style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i < Math.min(purchases.length, 5) - 1 ? `1px solid ${T.lineSoft}` : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 700, color: T.ink }}>
                      {(p as any).reward_title ?? 'Награда'}
                    </div>
                    <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, marginTop: 1 }}>
                      {new Date(p.purchased_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 10px', borderRadius: 999, background: statusColor + '18',
                    fontFamily: T.fDisp, fontSize: 11, fontWeight: 800, color: statusColor,
                  }}>{statusLabel}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Confirm sheet ════════════════════════════════════════════════════ */}
      {pending && (
        <div onClick={() => setPending(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: '20px 20px 30px', animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.1)' }}>
            <div style={{ width: 40, height: 4, background: T.line, borderRadius: 999, margin: '0 auto 18px' }}/>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 74, height: 74, borderRadius: 18, background: T.plumSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                {pending.icon || '🎁'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, letterSpacing: 1 }}>ПОДТВЕРДИ ПОКУПКУ</div>
                <div style={{ fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, lineHeight: 1.15, marginTop: 2 }}>{pending.title}</div>
                <div style={{ marginTop: 6 }}><CoinPill value={pending.price_coins ?? 0} size="md"/></div>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 16, background: T.pinkSoft, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 22 }}>🛡️</div>
              <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink, fontWeight: 600, lineHeight: 1.35 }}>
                Родитель получит запрос на одобрение. Это займёт ~15 минут.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <KMButton tone="ghost" full onClick={() => setPending(null)}>Отмена</KMButton>
              <KMButton tone="coral" full onClick={handleConfirm} disabled={purchasing}>
                {purchasing ? 'Отправка…' : 'Отправить запрос'}
              </KMButton>
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
  const [stage, setStage] = useState<'sent' | 'seen' | 'approved'>('sent')
  useEffect(() => {
    const t1 = setTimeout(() => setStage('seen'), 1600)
    const t2 = setTimeout(() => setStage('approved'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const steps = [
    { k: 'sent', l: 'Запрос отправлен', ic: '📤' },
    { k: 'seen', l: 'Родитель уведомлён', ic: '📱' },
    { k: 'approved', l: 'Одобрено!', ic: '🎉' },
  ]
  const curIdx = steps.findIndex(s => s.k === stage)
  return (
    <div onClick={stage === 'approved' ? onClose : undefined} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s', padding: 20 }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: 28, padding: 24, animation: 'popIn 0.35s cubic-bezier(.2,.9,.3,1.3)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: stage === 'approved' ? `linear-gradient(135deg, ${T.teal}, #3DB8B0)` : `linear-gradient(135deg, ${T.sun}, ${T.sunDeep})`, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: `0 10px 24px ${stage === 'approved' ? T.teal : T.sunDeep}66` }}>
          {stage === 'approved' ? '✓' : '⏳'}
        </div>
        <div style={{ fontFamily: T.fDisp, fontSize: 22, fontWeight: 900, color: T.ink, textAlign: 'center', marginTop: 14 }}>
          {stage === 'approved' ? 'Готово! 🎉' : 'Ждём родителя'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          {steps.map((s, i) => {
            const done = i <= curIdx
            return (
              <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: done ? T.tealSoft : T.lineSoft, border: `1.5px solid ${done ? T.teal + '40' : T.line}`, transition: 'all 0.4s' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? T.teal : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 900 }}>
                  {done ? '✓' : s.ic}
                </div>
                <span style={{ flex: 1, fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: done ? T.ink : T.ink3 }}>{s.l}</span>
              </div>
            )
          })}
        </div>
        {stage === 'approved' && (
          <div style={{ marginTop: 18 }}>
            <KMButton tone="teal" full onClick={onClose}>Отлично!</KMButton>
          </div>
        )}
      </div>
    </div>
  )
}
