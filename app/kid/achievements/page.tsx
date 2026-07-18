'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getChildBadges, getAvailableBadges, getBadgeProgress } from '@/lib/services/badges.service'
import { api } from '@/lib/api'
import type { Child } from '@/lib/api'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { T } from '@/components/kid/design/tokens'
import { SectionHeader, ProgressRing, Avatar } from '@/components/kid/design/atoms'
import { Tabs, Amount } from '@/components/design/atoms'
import ScreenHeader from '@/components/kid/design/ScreenHeader'
import { paper } from '@/lib/design/tokens'
import { levelForXp } from '@/lib/kid/level'
import { rankChildren, type RankEntry } from '@/lib/kid/rating-rank'
import { useDesktop } from '@/lib/hooks/useDesktop'
import { normalizeDate, getWeekRange, addDays } from '@/utils/helpers'
import { useT } from '@/lib/i18n'

// ─── Rating tab types & tones ─────────────────────────────────────────────────
// Podium ranks/medals are NOT money — non-gold accent/support tones only (D-07).
interface RatingEntry extends RankEntry {
  level: number
  xp: number
  coins: number
  badgeCount: number
  longestStreak: number
}

const RANK_TONES = [paper.accent, T.teal, T.pink] as const

function rankTone(rank: number) {
  return RANK_TONES[Math.min(rank - 1, RANK_TONES.length - 1)]
}

// Neutral secondary-stat chip (XP / badges / streak) — never gold, never StatusChip
// (those tones are reserved for status semantics per the UI-SPEC).
function StatChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <span title={label} aria-label={`${label}: ${value}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
      borderRadius: 999, background: T.lineSoft,
      fontFamily: T.fBody, fontSize: 11, fontWeight: 600, color: T.ink2,
      whiteSpace: 'nowrap',
    }}>
      <span aria-hidden="true">{icon}</span>
      <span style={{ fontFamily: T.fNum, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString('ru-RU')}</span>
    </span>
  )
}

// ─── Rarity config (labels are computed inside component via useT) ────────────
const RARITY_STATIC = [
  { bg: '#F5F0E4', ring: '#D9CFB8', labelBg: '#B8AE92', key: 'rarityCommon'  },
  { bg: '#D6F5F2', ring: T.teal,    labelBg: T.teal,    key: 'rarityRare'    },
  { bg: '#E9E5FB', ring: T.plum,    labelBg: T.plum,    key: 'rarityEpic'    },
  { bg: '#FFE4D6', ring: T.coral,   labelBg: T.coral,   key: 'rarityLegend'  },
]

// ─── Stagger variants ─────────────────────────────────────────────────────────
const listV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const itemV = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="kid-skeleton" style={{ height: 68, borderRadius: 16 }}/>
      {/* XP card */}
      <div className="kid-skeleton" style={{ height: 96, borderRadius: 16 }}/>
      {/* Tabs */}
      <div className="kid-skeleton" style={{ height: 52, borderRadius: 999 }}/>
      {/* Content */}
      <div className="kid-skeleton" style={{ height: 220, borderRadius: 16 }}/>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AchievementsPage() {
  const t = useT()
  const isDesktop = useDesktop()
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [coins, setCoins] = useState(0)
  const [earnedBadges, setEarnedBadges] = useState<any[]>([])
  const [streaks, setStreaks] = useState<any[]>([])
  const [badgeProgress, setBadgeProgress] = useState<Record<string, { current: number; target: number }>>({})
  const [focused, setFocused] = useState<any | null>(null)
  const [tab, setTab] = useState('badges')
  const [ratingState, setRatingState] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [entries, setEntries] = useState<RatingEntry[]>([])
  const [soloLastWeek, setSoloLastWeek] = useState<number>(0)

  useEffect(() => {
    if (!activeMemberId) return
    const load = async () => {
      setLoading(true)
      try {
        const [childData, earned, streaksData, wallet] = await Promise.all([
          api.getChild(activeMemberId),
          getChildBadges(activeMemberId),
          api.getStreaks(activeMemberId),
          getWallet(activeMemberId).catch(() => null),
        ])
        setChild(childData)
        setEarnedBadges(earned)
        setStreaks(streaksData ?? [])
        setCoins(wallet?.coins ?? 0)
        const prog = await getBadgeProgress(activeMemberId)
        setBadgeProgress(prog)
      } catch (err) {
        console.error('Achievements error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeMemberId])

  // Rating tab data (D-07/D-08) — lazy-loaded on first visit to the tab.
  // Reuses the old leaderboard's all-children query (N-length, Pitfall 5) and
  // feeds EVERY entry into rankChildren — no 2-child `.find()` compare.
  useEffect(() => {
    if (tab !== 'rating' || ratingState !== 'idle' || !activeMemberId) return
    setRatingState('loading')
    const load = async () => {
      try {
        const today = normalizeDate(new Date())
        const weekStart = getWeekRange(today).start
        const { createClient } = await import('@/lib/supabase/client')
        const { data: members } = await createClient()
          .from('family_members')
          .select('child_id')
          .eq('role', 'child')
          .not('child_id', 'is', null)
        const childIds = Array.from(new Set(
          (members ?? []).map((m: any) => m.child_id).filter(Boolean)
        )) as string[]
        const data = await Promise.all(childIds.map(async (id) => {
          const [c, wallet, weekScore, badges, streaksData] = await Promise.all([
            api.getChild(id).catch(() => null),
            getWallet(id).catch(() => null),
            api.getWeekScore(id, weekStart).then(w => w?.total ?? 0).catch(() => 0),
            getChildBadges(id).catch(() => []),
            api.getStreaks(id).catch(() => []),
          ])
          if (!c) return null
          const bestStreak = (streaksData as any[] ?? []).reduce((m: number, s: any) => Math.max(m, s.best_count ?? 0), 0)
          return {
            id, name: c.name, coinsWeek: weekScore ?? 0, avatarUrl: null,
            level: c.level ?? 1, xp: c.xp ?? 0, coins: wallet?.coins ?? 0,
            badgeCount: badges.length, longestStreak: bestStreak,
          } satisfies RatingEntry
        }))
        const list = data.filter(Boolean) as RatingEntry[]
        setEntries(list)
        if (list.length === 1) {
          // D-08 solo: this-week vs last-week via the same getWeekScore aggregation.
          // NOTE (RESEARCH caveat): getWeekScore is a hardcoded-formula approximation,
          // consistent with the wallet's "earned this week" chip — do not "fix" here.
          const lastWeekStart = getWeekRange(addDays(today, -7)).start
          const lw = await api.getWeekScore(list[0].id, lastWeekStart).then(w => w?.total ?? 0).catch(() => 0)
          setSoloLastWeek(lw)
        }
      } catch (err) {
        console.error('Rating error:', err)
      } finally {
        setRatingState('ready')
      }
    }
    load()
  }, [tab, ratingState, activeMemberId])

  // The single unearned badge the child is closest to (highest progress under 100%).
  // Drives the "Ближе всего" spotlight. Computed before any early return so the hook
  // order stays stable. Binary badges have no progress entry, so they never qualify.
  const closest = useMemo(() => {
    const all = getAvailableBadges()
    const earned = new Set(earnedBadges.map(b => b.badge_key))
    let best: { badge: ReturnType<typeof getAvailableBadges>[number]; cur: number; target: number; ratio: number } | null = null
    for (const badge of all) {
      if (earned.has(badge.key)) continue
      const p = badgeProgress[badge.key]
      if (!p || p.target <= 0) continue
      const ratio = Math.min(1, p.current / p.target)
      if (ratio <= 0 || ratio >= 1) continue
      if (!best || ratio > best.ratio) best = { badge, cur: p.current, target: p.target, ratio }
    }
    return best
  }, [earnedBadges, badgeProgress])

  if (loading) return <LoadingSkeleton/>

  // Rarity labels computed from t() inside component
  const RARITY = RARITY_STATIC.map(r => ({ ...r, label: t(`achievements.${r.key}`) }))
  function getRarity(xp: number) {
    if (xp >= 1000) return RARITY[3]
    if (xp >= 600) return RARITY[2]
    if (xp >= 400) return RARITY[1]
    return RARITY[0]
  }

  const allBadges = getAvailableBadges()
  const xp = child?.xp ?? 0
  const level = levelForXp(xp)
  const xpInLevel = xp % 1000

  // Per-badge "remaining" copy for the coach card — concrete and in kid voice.
  const REMAIN_KEY: Record<string, string> = {
    sportsman: 'achievements.remainSport',
    clean_master: 'achievements.remainRoom',
    study_lover: 'achievements.remainStudy',
    week_excellent: 'achievements.remainFives',
    full_week_grades: 'achievements.remainGradeDays',
    coin_saver: 'achievements.remainCoins',
    streak_30: 'achievements.remainStreak',
    goals_3: 'achievements.remainGoals',
    goals_5: 'achievements.remainGoals',
  }

  const cats = [
    { n: t('achievements.categoryStudy'),    icon: '📚', type: 'study',       col: T.plum  },
    { n: t('achievements.categoryRoom'),     icon: '🏠', type: 'room',        col: T.teal  },
    { n: t('achievements.categorySport'),    icon: '💪', type: 'sport',       col: T.coral },
    { n: t('achievements.categoryBehavior'), icon: '⭐', type: 'strong_week', col: T.pink  },
  ]

  const TAB_DEFS = [
    { id: 'badges',  label: t('achievements.tabBadges')  },
    { id: 'streaks', label: t('achievements.tabStreaks') },
    { id: 'rating',  label: t('achievements.tabRating')  },
  ]

  return (
    <div style={isDesktop ? { padding: '0 32px 110px' } : { paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      {/* ═══ Unified header (D-13) + XP/level (D-05) ═════════════════════════ */}
      <ScreenHeader title={t('kidHeader.awards')} coins={coins} name={child?.name ?? ''}/>

      {/* XP bar + level live with the header, above the tabs (D-05).
          Never gold: XP/level are not money — accent (indigo) fill only. */}
      <div style={{ padding: '4px 16px 0' }}>
        <div style={{ background: T.card, borderRadius: 16, padding: 16, border: `1px solid ${T.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8 }}>
            <span style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap' }}>
              {t('achievements.level', { level })}
            </span>
            <span style={{ fontFamily: T.fNum, fontSize: 12, fontWeight: 500, color: T.ink3, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {xpInLevel}/1000 XP
            </span>
          </div>
          <div style={{ height: 10, background: T.lineSoft, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(xpInLevel / 1000) * 100}%`, height: '100%',
              background: paper.accent, borderRadius: 999,
              transition: 'width 0.9s cubic-bezier(.2,.9,.3,1)',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontFamily: T.fBody, fontSize: 12, fontWeight: 500, color: T.ink2 }}>
              {earnedBadges.length} {t('achievements.badgesCount', { count: allBadges.length })}
            </span>
            <span style={{ fontFamily: T.fBody, fontSize: 12, fontWeight: 600, color: paper.accent }}>
              {t('achievements.nextLevel', { level: level + 1 })}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ 3 tabs: Бейджи / Стрики / Рейтинг (D-05) ════════════════════════ */}
      <div style={{ padding: '16px 16px 0' }}>
        <Tabs theme="paper" tabs={TAB_DEFS} value={tab} onChange={setTab}/>
      </div>

      {/* ═══ Tab: Badges ══════════════════════════════════════════════════════ */}
      {tab === 'badges' && (
        <>
          {/* "Almost there" coach card (signature) — paper card, accent ring */}
          {closest && (
            <div style={{ padding: '16px 16px 0' }}>
              <div
                onClick={() => setFocused({ ...closest.badge, earned: undefined, isEarned: false, progress01: closest.ratio, r: getRarity(closest.badge.xp ?? 0) })}
                style={{
                  borderRadius: 16, padding: 16, cursor: 'pointer',
                  background: T.card, border: `1.5px solid ${paper.accent}`,
                  boxShadow: '0 4px 14px rgba(91,75,212,0.10)',
                }}>
                <div style={{ fontFamily: T.fBody, fontSize: 12, color: paper.accent, fontWeight: 700, letterSpacing: 1.2 }}>
                  ★ {t('achievements.almostTitle')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                  <ProgressRing pct={closest.ratio * 100} size={84} stroke={9} color={paper.accent} bg={T.lineSoft}>
                    <div style={{ fontSize: 34 }}>{closest.badge.icon}</div>
                  </ProgressRing>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>
                      {t(closest.badge.titleKey)}
                    </div>
                    <div style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink2, fontWeight: 500, marginTop: 4 }}>
                      {t(REMAIN_KEY[closest.badge.key] ?? 'achievements.remainGeneric', { n: closest.target - closest.cur })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1, height: 8, background: T.lineSoft, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${closest.ratio * 100}%`, height: '100%', background: paper.accent, borderRadius: 999, transition: 'width 0.9s cubic-bezier(.2,.9,.3,1)' }}/>
                      </div>
                      <span style={{ fontFamily: T.fNum, fontSize: 12, fontWeight: 700, color: paper.accent, whiteSpace: 'nowrap' }}>+{closest.badge.xp} XP</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: T.fBody, fontSize: 13, fontWeight: 600, color: T.ink2, marginTop: 12, textAlign: 'center' }}>
                  {t('achievements.almostCheer')}
                </div>
              </div>
            </div>
          )}

          {/* Badges grid */}
          <div style={{ padding: '22px 16px 0' }}>
            <SectionHeader title={t('achievements.allBadges')}/>
            <motion.div variants={listV} initial="hidden" animate="show"
              style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
              {allBadges.slice(0, 12).map(badge => {
                const earned = earnedBadges.find(e => e.badge_key === badge.key)
                const isEarned = !!earned
                const prog = badgeProgress[badge.key]
                const r = getRarity(badge.xp ?? 0)
                const progress01 = prog ? Math.min(1, prog.current / prog.target) : 0
                return (
                  <motion.div key={badge.key} variants={itemV} onClick={() => setFocused({ ...badge, earned, isEarned, progress01, r })}
                    style={{
                      background: isEarned ? r.bg : '#F5F0E4',
                      borderRadius: 16, padding: '12px 8px 10px',
                      border: isEarned ? `2px solid ${r.ring}` : `1.5px dashed ${T.line}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      position: 'relative', cursor: 'pointer', overflow: 'hidden',
                    }}>
                    <div style={{
                      width: 54, height: 54, borderRadius: '50%',
                      background: isEarned ? '#fff' : '#EFE8D9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, position: 'relative',
                      filter: isEarned ? 'none' : 'grayscale(1) opacity(0.4)',
                      boxShadow: isEarned ? `0 3px 10px ${r.ring}66, inset 0 2px 4px rgba(255,255,255,0.8)` : 'none',
                      border: isEarned ? `2px solid ${r.ring}` : 'none',
                    }}>{badge.icon}</div>
                    <div style={{
                      marginTop: 6, fontFamily: T.fBody, fontSize: 11, fontWeight: 600,
                      color: isEarned ? T.ink : T.ink3, textAlign: 'center', lineHeight: 1.3,
                    }}>{t(badge.titleKey)}</div>
                    {isEarned ? (
                      <div style={{
                        marginTop: 4, padding: '1px 7px', borderRadius: 999,
                        background: r.labelBg, color: '#fff',
                        fontFamily: T.fBody, fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                      }}>{r.label.toUpperCase()}</div>
                    ) : (
                      <div style={{ width: '100%', marginTop: 6, height: 4, background: '#E8DFC9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${progress01 * 100}%`, height: '100%', background: T.ink3, borderRadius: 999 }}/>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </>
      )}

      {/* ═══ Tab: Streaks ═════════════════════════════════════════════════════ */}
      {tab === 'streaks' && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {cats.map(c => {
              const streak = streaks.find(s => s.streak_type === c.type)
              return (
                <div key={c.type} style={{
                  background: T.card, borderRadius: 16, padding: '12px 14px',
                  border: `1px solid ${T.line}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  display: 'flex', gap: 10, alignItems: 'center',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: c.col + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>{c.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.fBody, fontSize: 13, fontWeight: 600, color: T.ink }}>{c.n}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 1 }}>
                      <span style={{ fontFamily: T.fNum, fontSize: 18, fontWeight: 700, color: c.col, lineHeight: 1 }}>
                        {streak?.current_count ?? 0}
                      </span>
                      <span style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 600 }}>{t('achievements.streakDays')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ Tab: Rating (D-07 podium+list, D-08 solo fallback) ══════════════ */}
      {tab === 'rating' && (
        <div style={{ padding: '16px 16px 0' }}>
          {ratingState !== 'ready' ? (
            <div className="kid-skeleton" style={{ height: 240, borderRadius: 16 }}/>
          ) : entries.length === 0 ? (
            <div style={{
              background: T.card, borderRadius: 16, padding: 32, border: `1px solid ${T.line}`,
              textAlign: 'center', fontFamily: T.fBody, fontSize: 14, fontWeight: 500, color: T.ink3,
            }}>
              {t('kidLeaderboardPage.noData')}
            </div>
          ) : entries.length === 1 ? (
            /* D-08: single-child family — «я против себя», this week vs last week */
            <div style={{ background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>
                {t('achievements.soloCompareHeading')}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <div style={{
                  flex: 1, borderRadius: 12, padding: '12px 14px',
                  border: `1.5px solid ${paper.accent}`, background: T.card,
                }}>
                  <div style={{ fontFamily: T.fBody, fontSize: 12, fontWeight: 600, color: T.ink2 }}>
                    {t('achievements.soloThisWeek')}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Amount value={entries[0].coinsWeek} theme="paper" money size="lg"/>
                  </div>
                </div>
                {soloLastWeek > 0 && (
                  <div style={{
                    flex: 1, borderRadius: 12, padding: '12px 14px',
                    border: `1px solid ${T.line}`, background: T.lineSoft,
                  }}>
                    <div style={{ fontFamily: T.fBody, fontSize: 12, fontWeight: 600, color: T.ink3 }}>
                      {t('achievements.soloLastWeek')}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Amount value={soloLastWeek} theme="paper" money size="lg"/>
                    </div>
                  </div>
                )}
              </div>
              {soloLastWeek <= 0 && (
                <div style={{ fontFamily: T.fBody, fontSize: 13, fontWeight: 500, color: T.ink3, marginTop: 12, lineHeight: 1.5 }}>
                  {t('achievements.soloCompareEmpty')}
                </div>
              )}
            </div>
          ) : (
            /* D-07: N-children podium (top-3) + list for the rest */
            (() => {
              const { podium, list: rest } = rankChildren(entries)
              const spots = podium.map((e, i) => ({ e, rank: i + 1 }))
              const displayOrder = spots.length === 3 ? [spots[1], spots[0], spots[2]] : spots
              return (
                <>
                  <div style={{ background: T.card, borderRadius: 16, padding: '18px 12px 16px', border: `1px solid ${T.line}` }}>
                    <div style={{
                      textAlign: 'center', fontFamily: T.fBody, fontSize: 12, fontWeight: 600,
                      color: T.ink3, letterSpacing: 1.2,
                    }}>
                      {t('kidLeaderboardPage.familyRating')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16 }}>
                      {displayOrder.map(({ e, rank }) => {
                        const isMe = e.id === activeMemberId
                        const tone = rankTone(rank)
                        return (
                          <div key={e.id} style={{
                            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', paddingTop: rank === 1 ? 0 : 18,
                          }}>
                            <div style={{ position: 'relative' }}>
                              <Avatar size={rank === 1 ? 76 : 60} shirt={tone} glow={rank === 1}/>
                              <div aria-hidden="true" style={{
                                position: 'absolute', top: -4, right: -6, width: 24, height: 24,
                                borderRadius: '50%', background: tone, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: T.fNum, fontSize: 12, fontWeight: 700,
                                border: `2px solid ${T.card}`,
                              }}>{rank}</div>
                            </div>
                            <div style={{
                              marginTop: 8, fontFamily: T.fDisp, fontSize: rank === 1 ? 15 : 14, fontWeight: 700,
                              color: isMe ? paper.accent : T.ink, textAlign: 'center', lineHeight: 1.2,
                              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{e.name}</div>
                            {isMe && (
                              <div style={{ fontFamily: T.fBody, fontSize: 10, fontWeight: 700, color: paper.accent, letterSpacing: 0.8 }}>
                                {t('kidLeaderboardPage.youLabel')}
                              </div>
                            )}
                            <div style={{ marginTop: 2 }} title={t('kidLeaderboardPage.coinsWeek')}>
                              <Amount value={e.coinsWeek} theme="paper" money size={rank === 1 ? 'md' : 'sm'}/>
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                              <StatChip icon="⚡" value={e.xp} label={t('kidLeaderboardPage.xpTotal')}/>
                              <StatChip icon="🏆" value={e.badgeCount} label={t('kidLeaderboardPage.badges')}/>
                              <StatChip icon="🔥" value={e.longestStreak} label={t('kidLeaderboardPage.streakRecord')}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {rest.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {rest.map((e, i) => {
                        const rank = i + 4
                        const isMe = e.id === activeMemberId
                        return (
                          <div key={e.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: T.card, borderRadius: 12, padding: '10px 12px',
                            border: `1px solid ${isMe ? paper.accent : T.line}`,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: T.lineSoft, color: T.ink2,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: T.fNum, fontSize: 13, fontWeight: 700,
                            }}>{rank}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontFamily: T.fBody, fontSize: 14, fontWeight: 600,
                                color: isMe ? paper.accent : T.ink,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {e.name}{isMe ? ` · ${t('kidLeaderboardPage.youLabel')}` : ''}
                              </div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <StatChip icon="⚡" value={e.xp} label={t('kidLeaderboardPage.xpTotal')}/>
                                <StatChip icon="🏆" value={e.badgeCount} label={t('kidLeaderboardPage.badges')}/>
                                <StatChip icon="🔥" value={e.longestStreak} label={t('kidLeaderboardPage.streakRecord')}/>
                              </div>
                            </div>
                            <div title={t('kidLeaderboardPage.coinsWeek')}>
                              <Amount value={e.coinsWeek} theme="paper" money size="sm"/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()
          )}
        </div>
      )}

      {/* ═══ Badge bottom sheet ═══════════════════════════════════════════════ */}
      {focused && (
        <div onClick={() => setFocused(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(36,30,56,0.5)', display: 'flex',
          alignItems: 'flex-end', zIndex: 200, animation: 'fadeIn 0.2s',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: T.card,
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            padding: '20px 20px 40px', animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.1)',
          }}>
            <div style={{ width: 40, height: 4, background: T.line, borderRadius: 999, margin: '0 auto 16px' }}/>
            <div style={{
              width: 110, height: 110, borderRadius: '50%', margin: '0 auto',
              background: focused.isEarned ? focused.r.bg : '#F5F0E4',
              border: `3px solid ${focused.isEarned ? focused.r.ring : T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, filter: focused.isEarned ? 'none' : 'grayscale(1) opacity(0.5)',
              boxShadow: focused.isEarned ? `0 8px 24px ${focused.r.ring}55` : 'none',
            }}>{focused.icon}</div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <div style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 999,
                background: focused.r.labelBg, color: '#fff',
                fontFamily: T.fBody, fontSize: 10, fontWeight: 700, letterSpacing: 1,
              }}>{focused.r.label.toUpperCase()}</div>
              <div style={{ fontFamily: T.fDisp, fontSize: 24, fontWeight: 700, color: T.ink, marginTop: 8 }}>{t(focused.titleKey)}</div>
              <div style={{ fontFamily: T.fBody, fontSize: 14, fontWeight: 500, color: T.ink2, marginTop: 4 }}>{t(focused.descKey)}</div>
              {focused.isEarned ? (
                <div style={{ fontFamily: T.fBody, fontSize: 12, color: paper.successText, fontWeight: 600, marginTop: 12 }}>
                  {t('achievements.earnedAt', { date: focused.earned?.earned_at ? new Date(focused.earned.earned_at).toLocaleDateString() : '' })}
                </div>
              ) : (
                <div style={{ marginTop: 14, padding: '0 20px' }}>
                  <div style={{ height: 8, background: T.lineSoft, borderRadius: 999 }}>
                    <div style={{ width: `${focused.progress01 * 100}%`, height: '100%', background: focused.r.ring, borderRadius: 999 }}/>
                  </div>
                  <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginTop: 6, fontWeight: 500 }}>
                    {t('achievements.progress', { pct: Math.round(focused.progress01 * 100) })}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setFocused(null)} style={{
              marginTop: 20, width: '100%', height: 48, borderRadius: 12,
              background: paper.accent, color: '#fff', border: 'none',
              fontFamily: T.fBody, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>{t('achievements.closeButton')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
