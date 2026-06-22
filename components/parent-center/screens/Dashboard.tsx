'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Sparkline, Ring, Coin, SectionH, Icon } from '../ui'
import type { ParentChild, ActivityEntry, ActionType } from '../types'
import type { RewardPurchase } from '@/lib/models/wallet.types'
import { useT, useLanguage } from '@/lib/i18n'

function useCountUp(target: number, duration = 800) {
  const [n, setN] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const from = 0  // always count from 0 on first mount
    const to = target
    if (from === to) { setN(to); return }
    const t0 = performance.now()
    let raf: number
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const e = 1 - Math.pow(1 - t, 3)  // cubic ease-out
      setN(Math.round(from + (to - from) * e))
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return n
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

type ReadingCheck = { id: string; child_id: string; date: string; book_title: string; pages_read: number; minutes_read: number }

type Props = {
  children: ParentChild[]
  activity: ActivityEntry[]
  pending: RewardPurchase[]
  readingChecks?: ReadingCheck[]
  onApproveReading?: (r: ReadingCheck) => void
  onRejectReading?: (r: ReadingCheck) => void
  childName?: (id: string) => string
  onAction: (child: ParentChild, action: ActionType) => void
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
  onOpenChild: (id: string) => void
  onFillDay?: () => void
}

function ChildCard({ child, onAction }: { child: ParentChild; onAction: Props['onAction'] }) {
  const animatedBalance = useCountUp(child.balance)
  const t = useT()
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
              {animatedBalance.toLocaleString()}<span style={{ marginLeft: 3, opacity: 0.8 }}>🪙</span>
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
            {t('parentCenter.dashboard.lastWeekCoins')}
          </div>
          <Sparkline data={child.week} color={child.accent} w={160} h={32}/>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('parentCenter.dashboard.today')}</div>
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
          { label: t('parentCenter.dashboard.reward'), icon: '🌟', act: 'reward' as ActionType },
          { label: t('parentCenter.dashboard.penalty'), icon: '⚠️', act: 'penalty' as ActionType },
          { label: t('parentCenter.dashboard.freeze'), icon: '❄️', act: 'freeze' as ActionType },
          { label: t('parentCenter.dashboard.bonus'), icon: '💰', act: 'bonus' as ActionType },
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
  const t = useT()
  if (!child) return null
  const toneMap: Record<string, 'success' | 'danger' | 'indigo'> = {
    earn_coins: 'success', penalty: 'danger', bonus: 'indigo',
  }
  const labelMap: Record<string, string> = {
    earn_coins: t('parentCenter.dashboard.earn'),
    penalty: t('parentCenter.dashboard.penaltyLabel'),
    bonus: t('parentCenter.dashboard.bonusLabel'),
  }
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

export default function Dashboard({ children, activity, pending, readingChecks = [], onApproveReading, onRejectReading, childName, onAction, onApprove, onDecline, onOpenChild, onFillDay }: Props) {
  const filledCount = children.filter(c => c.todayPct > 50).length
  const t = useT()
  const { language } = useLanguage()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('parentCenter.dashboard.goodMorning') : hour < 18 ? t('parentCenter.dashboard.goodAfternoon') : t('parentCenter.dashboard.goodEvening')
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'

  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
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
            {t('parentCenter.dashboard.todayFilled').replace('{filled}', String(filledCount)).replace('{total}', String(children.length))}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {filledCount < children.length ? t('parentCenter.dashboard.fillRemaining') : t('parentCenter.dashboard.allSet')}
          </div>
        </div>
        <Btn variant="solid" size="sm" onClick={onFillDay}>{t('parentCenter.dashboard.fillDay')}</Btn>
      </Card>

      {readingChecks.length > 0 && (
        <div>
          <SectionH title={t('parentCenter.dashboard.readingChecks')} sub={t('parentCenter.dashboard.readingChecksSub')}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {readingChecks.map(r => (
              <Card key={r.id} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 26 }}>📖</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.book_title || t('parentCenter.dashboard.aBook')}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {childName?.(r.child_id) ?? r.child_id} · {r.pages_read || 0} стр · {r.minutes_read || 0} мин
                  </div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => onRejectReading?.(r)}>{t('parentCenter.dashboard.rejectRead')}</Btn>
                <Btn variant="solid" size="sm" onClick={() => onApproveReading?.(r)}>{t('parentCenter.dashboard.approveRead')}</Btn>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionH title={t('parentCenter.dashboard.children')} sub={t('parentCenter.dashboard.tapToOpen')}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children.map(c => (
            <div key={c.id} onClick={() => onOpenChild(c.id)} style={{ cursor: 'pointer' }}>
              <ChildCard child={c} onAction={onAction}/>
            </div>
          ))}
          {children.length === 0 && (
            <Card pad={24} style={{ textAlign: 'center' }}>
              <div style={{ color: T.muted, fontSize: 13 }}>{t('parentCenter.dashboard.noChildren')}</div>
            </Card>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <SectionH title={t('parentCenter.dashboard.pendingApprovals')}
            sub={pending.length > 1
              ? t('parentCenter.dashboard.shopRequestsPlural').replace('{count}', String(pending.length))
              : t('parentCenter.dashboard.shopRequests').replace('{count}', String(pending.length))}
            action={<Pill tone="warn" icon="bell">!</Pill>}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(p => {
              const child = children.find(c => c.id === p.child_id)
              if (!child) return null
              return (
                <Card key={p.id} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar child={child} size={36}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
                      {child.name} {t('parentCenter.dashboard.wants')} <span style={{ color: T.cyan }}>{p.reward_title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      <span style={{ fontFamily: T.fMono, fontWeight: 600 }}>{p.frozen_coins}🪙</span>
                    </div>
                  </div>
                  <Btn variant="ghost" size="sm" icon="x" onClick={() => onDecline(p)}>{t('parentCenter.dashboard.decline')}</Btn>
                  <Btn variant="primary" size="sm" icon="check" onClick={() => onApprove(p)}>{t('parentCenter.dashboard.approve')}</Btn>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <SectionH title={t('parentCenter.dashboard.activity')} sub={t('parentCenter.dashboard.recentActions')}
          action={<Btn variant="outline" size="sm" icon="filter">{t('parentCenter.dashboard.allFilter')}</Btn>}/>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <motion.div variants={listVariants} initial="hidden" animate="show">
            {activity.slice(0, 8).map((a, i) => (
              <motion.div key={i} variants={itemVariants}>
                <ActivityRow a={a} allChildren={children}/>
              </motion.div>
            ))}
          </motion.div>
          {activity.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: 13 }}>{t('parentCenter.dashboard.noActivity')}</div>
          )}
          {activity.length > 0 && (
            <button
              onClick={() => window.location.href = '/parent/wallets'}
              style={{
                width: '100%', padding: 12, background: 'transparent', border: 'none',
                color: T.muted, fontFamily: T.fBody, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
              {t('parentCenter.dashboard.viewAll')}
            </button>
          )}
        </Card>
      </div>
    </div>
  )
}
