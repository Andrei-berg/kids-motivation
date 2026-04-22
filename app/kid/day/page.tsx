'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { api, getChildren } from '@/lib/api'
import type { Child, DayData, SubjectGrade, Goal } from '@/lib/api'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { KidDayFillForm } from '@/components/kid/KidDayFillForm'
import { getVacationPeriods } from '@/lib/vacation-api'
import type { Wallet } from '@/lib/models/wallet.types'
import { T } from '@/components/kid/design/tokens'
import {
  Avatar, Coin, CoinPill, XPBar, StreakFlame, ProgressRing,
  KMButton, AnimatedNum, Confetti, SectionHeader,
} from '@/components/kid/design/atoms'

// ─── Reward constants ────────────────────────────────────────────────────────
const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const RU_DAY = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const RU_MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function todayLabel(): string {
  const d = new Date()
  return `${RU_DAY[d.getDay()]}, ${d.getDate()} ${RU_MONTH_SHORT[d.getMonth()]}`
}

// ─── Task item type ───────────────────────────────────────────────────────────
interface TaskItem {
  id: string
  title: string
  cat: string
  catColor: string
  coins: number
  done: boolean
  xp?: number
  boss?: boolean
  time?: string
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[240, 56, 100, 80, 80, 80].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KidDayPage() {
  const { activeMemberId, setActiveMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [todayDay, setTodayDay] = useState<DayData | null>(null)
  const [todayGrades, setTodayGrades] = useState<SubjectGrade[]>([])
  const [streaks, setStreaks] = useState<any[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [medal, setMedal] = useState<{ message: string; coins: number; sent_by: string | null } | null>(null)
  const [showFillForm, setShowFillForm] = useState(false)
  const [dayType, setDayType] = useState<'school' | 'weekend' | 'vacation'>('school')
  const [confetti, setConfetti] = useState(0)
  const [confettiPos, setConfettiPos] = useState({ x: '50%', y: '50%' })

  const today = normalizeDate(new Date())
  const { start: weekStart } = getWeekRange(today)

  const loadData = useCallback(async () => {
    if (!activeMemberId) { setLoading(false); return }
    setLoading(true)
    try {
      let resolvedId = activeMemberId
      let childData: Child | null = null
      try {
        childData = await api.getChild(activeMemberId)
      } catch {
        const all = await getChildren()
        if (all.length > 0) {
          childData = all[0]
          resolvedId = all[0].id
          setActiveMemberId(resolvedId)
        }
      }
      if (!childData) { setLoading(false); return }

      const [dayData, grades, streaksData, walletData, medalResult] = await Promise.all([
        api.getDay(resolvedId, today),
        api.getSubjectGradesForDate(resolvedId, today),
        api.getStreaks(resolvedId),
        getWallet(resolvedId),
        (async () => {
          try {
            const { createClient } = await import('@/lib/supabase/client')
            const { data } = await createClient()
              .from('medals')
              .select('message, coins, sent_by')
              .eq('child_id', resolvedId)
              .eq('date', today)
              .maybeSingle()
            return data ?? null
          } catch { return null }
        })(),
      ])

      setChild(childData)
      setTodayDay(dayData)
      setTodayGrades(grades)
      setWallet(walletData)
      setMedal(medalResult)
      const activeStreaks = (streaksData ?? []).filter((s: any) => s.current_count > 0)
      setStreaks(activeStreaks)
    } catch (err) {
      console.error('KidDayPage error', err)
    } finally {
      setLoading(false)
    }
  }, [activeMemberId, today])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingSkeleton/>
  if (!activeMemberId) return (
    <div className="flex items-center justify-center min-h-screen px-6 text-center" style={{ color: T.ink3 }}>
      Ребёнок не определён
    </div>
  )

  // ─── Build tasks from real data ───────────────────────────────────────────
  const tasks: TaskItem[] = []

  if (todayDay?.room_ok !== undefined || todayDay === null) {
    tasks.push({
      id: 'room',
      title: 'Убрать комнату',
      cat: 'Дом',
      catColor: T.teal,
      coins: 3,
      done: todayDay?.room_ok ?? false,
    })
  }

  if (todayDay?.good_behavior !== undefined || todayDay === null) {
    tasks.push({
      id: 'behavior',
      title: 'Хорошее поведение',
      cat: 'Поведение',
      catColor: T.mint,
      coins: 5,
      done: todayDay?.good_behavior ?? false,
    })
  }

  todayGrades.forEach((g, i) => {
    const c = GRADE_COINS[g.grade] ?? 0
    tasks.push({
      id: `grade-${i}`,
      title: g.subject,
      cat: 'Учёба',
      catColor: T.plum,
      coins: c,
      done: true,
      xp: g.grade === 5 ? 25 : g.grade === 4 ? 15 : 0,
      boss: g.grade === 5,
    })
  })

  if (todayGrades.length === 0 && todayDay === null) {
    tasks.push({
      id: 'homework',
      title: 'Домашнее задание',
      cat: 'Учёба',
      catColor: T.plum,
      coins: 5,
      done: false,
      xp: 25,
      boss: true,
    })
  }

  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const coins = wallet?.coins ?? 0
  const xp = child?.xp ?? 0
  const xpToNext = 1000
  const level = child?.level ?? 1
  const streakDays = streaks.reduce((max, s) => Math.max(max, s.current_count), 0)
  const avatarSkin = '#F5C9A1'
  const avatarHair = '#2B1810'
  const avatarShirt = T.coral

  function handleFillSaved(coinsEarned: number) {
    setShowFillForm(false)
    if (coinsEarned > 0) setConfetti(c => c + 1)
    loadData()
  }

  return (
    <div style={{ paddingBottom: 110, position: 'relative', maxWidth: 500, margin: '0 auto' }}>
      <Confetti trigger={confetti} origin={confettiPos}/>

      {/* ═══ Hero card ════════════════════════════════════════════════════════ */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.coral} 0%, #FF9547 55%, ${T.sunDeep} 100%)`,
          borderRadius: 28, padding: 20, position: 'relative', overflow: 'hidden',
          boxShadow: `0 10px 30px ${T.coral}40`,
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}/>
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
            <Avatar size={66} skin={avatarSkin} hair={avatarHair} shirt="#6C5CE7"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.fBody, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                Привет,
              </div>
              <div style={{ fontFamily: T.fDisp, fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                {child?.name ?? '...'} 👋
              </div>
              <div style={{
                marginTop: 6, display: 'inline-flex', gap: 6, alignItems: 'center',
                padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
              }}>
                <span style={{ fontSize: 11 }}>✨</span>
                <span style={{ fontFamily: T.fBody, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  Уровень {level}
                </span>
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginTop: 16, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.fDisp, fontWeight: 900, fontSize: 14, color: T.coral,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)', flexShrink: 0,
                }}>{level}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 0.8, whiteSpace: 'nowrap' }}>УРОВЕНЬ {level}</div>
                  <div style={{ fontFamily: T.fDisp, fontSize: 12, color: '#fff', fontWeight: 800, marginTop: 2, whiteSpace: 'nowrap' }}>до следующего: {xpToNext - (xp % xpToNext)} XP</div>
                </div>
              </div>
              <div style={{ fontFamily: T.fNum, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {xp % xpToNext}/{xpToNext}
              </div>
            </div>
            <div style={{ height: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}>
              <div style={{
                width: `${((xp % xpToNext) / xpToNext) * 100}%`, height: '100%',
                background: `linear-gradient(90deg, ${T.sun}, #fff)`,
                borderRadius: 999, boxShadow: `0 0 10px ${T.sun}`,
              }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Stats row ════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0' }}>
        <StreakFlame days={streakDays}/>
        <div style={{
          flex: 1, background: '#fff', borderRadius: 999, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1.5px solid ${T.sunDeep}`, boxShadow: `0 4px 14px rgba(0,0,0,0.04)`,
        }}>
          <Coin size={24}/>
          <span style={{ fontFamily: T.fNum, fontSize: 17, fontWeight: 800, color: T.ink }}>
            <AnimatedNum value={coins}/>
          </span>
          <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600, marginLeft: 'auto' }}>монет</span>
        </div>
      </div>

      {/* ═══ Progress + ring ══════════════════════════════════════════════════ */}
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{
          background: '#fff', borderRadius: 24, padding: 18,
          display: 'flex', gap: 16, alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: `1.5px solid ${T.line}`,
        }}>
          <ProgressRing pct={pct} size={92} stroke={10} color={T.teal} bg={T.tealSoft}>
            <div style={{ fontFamily: T.fDisp, fontSize: 24, fontWeight: 900, color: T.ink, lineHeight: 1 }}>
              {pct}<span style={{ fontSize: 14 }}>%</span>
            </div>
            <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700, letterSpacing: 0.5, marginTop: 2 }}>СЕГОДНЯ</div>
          </ProgressRing>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, letterSpacing: 1 }}>{todayLabel().toUpperCase()}</div>
            <div style={{ fontFamily: T.fDisp, fontSize: 22, fontWeight: 900, color: T.ink, lineHeight: 1.1, marginTop: 2 }}>
              {done}/{total} задач
            </div>
            {todayDay === null ? (
              <button
                onClick={() => setShowFillForm(true)}
                style={{
                  marginTop: 8, height: 32, padding: '0 16px', borderRadius: 999,
                  background: T.coral, color: '#fff', border: 'none',
                  fontFamily: T.fDisp, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  boxShadow: `0 3px 10px ${T.coral}55`,
                }}
              >Заполнить день →</button>
            ) : (
              <div style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink3, marginTop: 6, lineHeight: 1.3 }}>
                {total - done > 0
                  ? <>Осталось <b style={{ color: T.ink }}>{total - done}</b> задачи</>
                  : <span style={{ color: T.teal, fontWeight: 700 }}>Всё выполнено! 🎉</span>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Tasks ════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionHeader title="Задания на сегодня" sub={`${total - done} осталось`}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {tasks.map(t => (
            <TaskCard key={t.id} t={t}/>
          ))}
          {todayDay === null && (
            <button
              onClick={() => setShowFillForm(true)}
              style={{
                height: 56, borderRadius: 20, border: `2px dashed ${T.line}`,
                background: T.lineSoft, cursor: 'pointer',
                fontFamily: T.fDisp, fontSize: 15, fontWeight: 800, color: T.ink3,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>+</span> Добавить результаты
            </button>
          )}
        </div>
      </div>

      {/* ═══ Notifications ════════════════════════════════════════════════════ */}
      {(streaks.length > 0 || medal) && (
        <div style={{ padding: '24px 16px 0' }}>
          <SectionHeader title="Уведомления"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {medal && (
              <NotifCard
                icon="🏅"
                type="bonus"
                title={`Награда: ${medal.coins} монет`}
                sub={medal.message}
                time="Сегодня"
              />
            )}
            {streaks.map((s, i) => (
              <NotifCard
                key={i}
                icon="🔥"
                type="level"
                title={`Серия: ${s.current_count} дней`}
                sub={`Тип: ${s.streak_type} · Рекорд: ${s.best_count}`}
                time={`${s.current_count}д`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Fill form modal ══════════════════════════════════════════════════ */}
      {showFillForm && activeMemberId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowFillForm(false)}>
          <div
            className="w-full bg-white rounded-t-3xl"
            style={{ animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.1)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: T.line, borderRadius: 999, margin: '14px auto 0' }}/>
            <KidDayFillForm
              childId={activeMemberId}
              date={today}
              fillMode={child?.kid_fill_mode ?? 1}
              dayType={dayType}
              existingDay={todayDay}
              onSaved={handleFillSaved}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Task card ───────────────────────────────────────────────────────────────
function TaskCard({ t }: { t: TaskItem }) {
  return (
    <div style={{
      background: t.done ? T.lineSoft : '#fff',
      borderRadius: 20, padding: '14px 14px 14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      border: t.boss && !t.done ? `2px solid ${T.coral}` : `1.5px solid ${t.done ? 'transparent' : T.line}`,
      boxShadow: t.done ? 'none' : '0 2px 10px rgba(0,0,0,0.03)',
      position: 'relative', overflow: 'hidden',
      opacity: t.done ? 0.65 : 1,
    }}>
      {t.boss && !t.done && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: T.coral, color: '#fff',
          fontFamily: T.fDisp, fontSize: 9, fontWeight: 900, letterSpacing: 1,
          padding: '2px 10px', borderBottomLeftRadius: 8,
        }}>ГЛАВНОЕ</div>
      )}
      <div style={{
        width: 32, height: 32, borderRadius: 12,
        background: t.done ? T.teal : '#fff',
        border: `2.5px solid ${t.done ? T.teal : T.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {t.done && (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M3 8l3.5 3.5L13 5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fDisp, fontSize: 15, fontWeight: 800, color: T.ink,
          textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.2,
        }}>{t.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{
            fontFamily: T.fBody, fontSize: 11, fontWeight: 700,
            color: t.catColor, padding: '1px 7px', borderRadius: 5,
            background: t.catColor + '18',
          }}>{t.cat}</span>
          {t.time && (
            <span style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 600 }}>{t.time}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
        <CoinPill value={t.coins} size="sm"/>
        {t.xp && t.xp > 0 && (
          <span style={{ fontFamily: T.fNum, fontSize: 10, fontWeight: 800, color: T.plum, letterSpacing: 0.3 }}>
            +{t.xp} XP
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Notification card ────────────────────────────────────────────────────────
function NotifCard({ icon, type, title, sub, time }: {
  icon: string; type: string; title: string; sub: string; time: string
}) {
  const bgs: Record<string, string> = {
    bonus: `linear-gradient(135deg, ${T.sun}, ${T.sunDeep})`,
    level: `linear-gradient(135deg, ${T.plumSoft}, #D4CDFA)`,
    mom:   `linear-gradient(135deg, ${T.pinkSoft}, #FFD0DE)`,
  }
  return (
    <div style={{
      background: bgs[type] ?? bgs.level, borderRadius: 20, padding: 14,
      display: 'flex', gap: 12, alignItems: 'flex-start',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.fDisp, fontSize: 15, fontWeight: 800, color: T.ink, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink2, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
      </div>
      <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>{time}</span>
    </div>
  )
}
