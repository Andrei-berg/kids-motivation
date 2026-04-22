'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getChildBadges, getAvailableBadges } from '@/lib/services/badges.service'
import { api } from '@/lib/api'
import type { Child } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { T } from '@/components/kid/design/tokens'
import { XPBar, SectionHeader } from '@/components/kid/design/atoms'

// ─── Badge progress computation ───────────────────────────────────────────────
async function computeBadgeProgress(childId: string, streaks: any[]) {
  const progress: Record<string, { current: number; target: number }> = {}
  const [{ count: roomDays }, { count: sportDays }, { count: grade5Days }] = await Promise.all([
    supabase.from('days').select('*', { count: 'exact', head: true }).eq('child_id', childId).eq('room_ok', true),
    supabase.from('home_sports').select('*', { count: 'exact', head: true }).eq('child_id', childId),
    supabase.from('subject_grades').select('*', { count: 'exact', head: true }).eq('child_id', childId).eq('grade', 5),
  ])
  progress['clean_master'] = { current: roomDays ?? 0, target: 30 }
  progress['sportsman'] = { current: sportDays ?? 0, target: 14 }
  progress['week_excellent'] = { current: grade5Days ?? 0, target: 7 }
  const bestStreak = streaks.reduce((max, s) => Math.max(max, s.best_count), 0)
  progress['streak_30'] = { current: bestStreak, target: 30 }
  return progress
}

// ─── Rarity config ────────────────────────────────────────────────────────────
const RARITY = [
  { bg: '#F5F0E4', ring: '#D9CFB8', label: 'Обычный', labelBg: '#B8AE92' },
  { bg: '#D6F5F2', ring: T.teal,    label: 'Редкий',  labelBg: T.teal    },
  { bg: '#E9E5FB', ring: T.plum,    label: 'Эпик',    labelBg: T.plum    },
  { bg: '#FFE4D6', ring: T.coral,   label: 'Легенда', labelBg: T.coral   },
]
function getRarity(xp: number) {
  if (xp >= 1000) return RARITY[3]
  if (xp >= 600) return RARITY[2]
  if (xp >= 400) return RARITY[1]
  return RARITY[0]
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[200, 72, 72, 200, 150].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AchievementsPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [earnedBadges, setEarnedBadges] = useState<any[]>([])
  const [streaks, setStreaks] = useState<any[]>([])
  const [badgeProgress, setBadgeProgress] = useState<Record<string, { current: number; target: number }>>({})
  const [focused, setFocused] = useState<any | null>(null)

  useEffect(() => {
    if (!activeMemberId) return
    const load = async () => {
      setLoading(true)
      try {
        const [childData, earned, streaksData] = await Promise.all([
          api.getChild(activeMemberId),
          getChildBadges(activeMemberId),
          api.getStreaks(activeMemberId),
        ])
        setChild(childData)
        setEarnedBadges(earned)
        setStreaks(streaksData ?? [])
        const prog = await computeBadgeProgress(activeMemberId, streaksData ?? [])
        setBadgeProgress(prog)
      } catch (err) {
        console.error('Achievements error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeMemberId])

  if (loading) return <LoadingSkeleton/>

  const allBadges = getAvailableBadges()
  const earnedKeys = new Set(earnedBadges.map(b => b.badge_key))
  const level = child?.level ?? 1
  const xpInLevel = (child?.xp ?? 0) % 1000

  const cats = [
    { n: 'Учёба',    icon: '📚', type: 'study',  col: T.plum  },
    { n: 'Дом',      icon: '🏠', type: 'room',   col: T.teal  },
    { n: 'Спорт',    icon: '💪', type: 'sport',  col: T.coral },
    { n: 'Поведение',icon: '⭐', type: 'strong_week', col: T.pink },
  ]

  return (
    <div style={{ paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      {/* ═══ Hero ═════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          borderRadius: 28, padding: 20, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${T.teal} 0%, #3DB8B0 60%, ${T.plum} 100%)`,
          boxShadow: `0 10px 30px ${T.teal}40`,
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 1.5 }}>ТРОФЕЙНАЯ КОМНАТА</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: T.fNum, fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>{earnedBadges.length}</span>
              <span style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>/ {allBadges.length} значков</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
                <span style={{ fontFamily: T.fDisp, fontSize: 12, color: '#fff', fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                  УР. {level} · {child?.name ?? ''}
                </span>
                <span style={{ fontFamily: T.fNum, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {xpInLevel}/1000 XP
                </span>
              </div>
              <div style={{ height: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}>
                <div style={{ width: `${(xpInLevel / 1000) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${T.sun}, #fff)`, borderRadius: 999, boxShadow: `0 0 10px ${T.sun}` }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Уровень {level}</span>
                <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.sun, fontWeight: 800 }}>Следующий: {level + 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Category streaks ═════════════════════════════════════════════════ */}
      <div style={{ padding: '20px 16px 0' }}>
        <h3 style={{ margin: '0 0 12px', fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>Серии по категориям</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {cats.map(c => {
            const streak = streaks.find(s => s.streak_type === c.type)
            return (
              <div key={c.type} style={{
                background: '#fff', borderRadius: 18, padding: '12px 14px',
                border: `1.5px solid ${T.line}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: c.col + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>{c.n}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 1 }}>
                    <span style={{ fontFamily: T.fNum, fontSize: 18, fontWeight: 800, color: c.col, lineHeight: 1 }}>
                      {streak?.current_count ?? 0}
                    </span>
                    <span style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700 }}>дн. 🔥</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ Badges grid ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '22px 16px 0' }}>
        <SectionHeader title="Все значки"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
          {allBadges.map(badge => {
            const earned = earnedBadges.find(e => e.badge_key === badge.key)
            const isEarned = !!earned
            const prog = badgeProgress[badge.key]
            const r = getRarity(badge.xp ?? 0)
            const progress01 = prog ? Math.min(1, prog.current / prog.target) : 0
            return (
              <div key={badge.key} onClick={() => setFocused({ ...badge, earned, isEarned, progress01, r })}
                style={{
                  background: isEarned ? r.bg : '#F5F0E4',
                  borderRadius: 18, padding: '12px 8px 10px',
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
                  marginTop: 6, fontFamily: T.fDisp, fontSize: 11, fontWeight: 800,
                  color: isEarned ? T.ink : T.ink3, textAlign: 'center', lineHeight: 1.15,
                }}>{badge.title}</div>
                {isEarned ? (
                  <div style={{
                    marginTop: 4, padding: '1px 7px', borderRadius: 999,
                    background: r.labelBg, color: '#fff',
                    fontFamily: T.fDisp, fontSize: 9, fontWeight: 800, letterSpacing: 0.8,
                  }}>{r.label.toUpperCase()}</div>
                ) : (
                  <div style={{ width: '100%', marginTop: 6, height: 4, background: '#E8DFC9', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${progress01 * 100}%`, height: '100%', background: T.ink3, borderRadius: 999 }}/>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ Badge bottom sheet ═══════════════════════════════════════════════ */}
      {focused && (
        <div onClick={() => setFocused(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'flex-end', zIndex: 200, animation: 'fadeIn 0.2s',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: '#fff',
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
                fontFamily: T.fDisp, fontSize: 10, fontWeight: 900, letterSpacing: 1,
              }}>{focused.r.label.toUpperCase()}</div>
              <div style={{ fontFamily: T.fDisp, fontSize: 24, fontWeight: 900, color: T.ink, marginTop: 8 }}>{focused.title}</div>
              <div style={{ fontFamily: T.fBody, fontSize: 14, color: T.ink3, marginTop: 4 }}>{focused.description}</div>
              {focused.isEarned ? (
                <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.teal, fontWeight: 700, marginTop: 12 }}>
                  ✓ Получен {focused.earned?.earned_at ? new Date(focused.earned.earned_at).toLocaleDateString('ru-RU') : ''}
                </div>
              ) : (
                <div style={{ marginTop: 14, padding: '0 20px' }}>
                  <div style={{ height: 8, background: T.lineSoft, borderRadius: 999 }}>
                    <div style={{ width: `${focused.progress01 * 100}%`, height: '100%', background: focused.r.ring, borderRadius: 999 }}/>
                  </div>
                  <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginTop: 6, fontWeight: 600 }}>
                    {Math.round(focused.progress01 * 100)}% — продолжай!
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setFocused(null)} style={{
              marginTop: 20, width: '100%', height: 48, borderRadius: 24,
              background: T.ink, color: '#fff', border: 'none',
              fontFamily: T.fDisp, fontSize: 16, fontWeight: 800, cursor: 'pointer',
            }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}
