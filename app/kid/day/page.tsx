'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { api, getChildren } from '@/lib/api'
import type { Child } from '@/lib/api'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { KidDayFillForm } from '@/components/kid/KidDayFillForm'
import { getVacationPeriods } from '@/lib/vacation-api'
import type { Wallet } from '@/lib/models/wallet.types'
import { T } from '@/components/kid/design/tokens'
import { Avatar, Coin, AnimatedNum, StreakFlame, Confetti } from '@/components/kid/design/atoms'

const RU_DAY = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const RU_MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function todayLabel(): string {
  const d = new Date()
  return `${RU_DAY[d.getDay()]}, ${d.getDate()} ${RU_MONTH_SHORT[d.getMonth()]}`
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[240, 56, 100, 80, 80, 80].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

export default function KidDayPage() {
  const { activeMemberId, setActiveMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [todayDay, setTodayDay] = useState<any | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [streaks, setStreaks] = useState<any[]>([])
  const [dayType, setDayType] = useState<'school' | 'weekend' | 'vacation'>('school')
  const [editMode, setEditMode] = useState(false)
  const [confetti, setConfetti] = useState(0)

  const today = normalizeDate(new Date())

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

      const [dayData, walletData, streaksData] = await Promise.all([
        api.getDay(resolvedId, today),
        getWallet(resolvedId),
        api.getStreaks(resolvedId),
      ])

      setChild(childData)
      setTodayDay(dayData)
      setWallet(walletData)
      setStreaks((streaksData ?? []).filter((s: any) => s.current_count > 0))

      // Determine day type
      try {
        const vacations = await getVacationPeriods(resolvedId)
        const isVacation = (vacations ?? []).some((v: any) => v.start_date <= today && v.end_date >= today)
        if (isVacation) { setDayType('vacation'); return }
      } catch {}
      const dow = new Date(today).getDay()
      setDayType(dow === 0 || dow === 6 ? 'weekend' : 'school')
    } catch (err) {
      console.error('KidDayPage error', err)
    } finally {
      setLoading(false)
    }
  }, [activeMemberId, today])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingSkeleton/>
  if (!activeMemberId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: T.ink3, fontFamily: T.fBody }}>
      Ребёнок не определён
    </div>
  )

  const coins = wallet?.coins ?? 0
  const level = child?.level ?? 1
  const streakDays = streaks.reduce((max, s) => Math.max(max, s.current_count), 0)
  const fillMode = (child as any)?.kid_fill_mode ?? 3

  function handleFillSaved(coinsEarned: number) {
    setEditMode(false)
    if (coinsEarned > 0) setConfetti(c => c + 1)
    loadData()
  }

  // Show the form if no day yet OR in edit mode
  const showForm = todayDay === null || editMode

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative' }}>
      <Confetti trigger={confetti}/>

      {/* ─── Top header ─── */}
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={38} skin="#F5C9A1" hair="#2B1810" shirt={T.coral}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fDisp, fontSize: 15, fontWeight: 900, color: T.ink }}>Привет, {child?.name ?? '...'} 👋</div>
          <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>Ур. {level} · {todayLabel()}</div>
        </div>
        <StreakFlame days={streakDays}/>
      </div>

      {showForm ? (
        // ─── Fill form ───
        <>
          {editMode && todayDay && (
            <div style={{ padding: '8px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditMode(false)} style={{
                height: 30, padding: '0 12px', borderRadius: 15, border: `1.5px solid ${T.line}`,
                background: '#fff', cursor: 'pointer', fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 700,
              }}>← Назад</button>
            </div>
          )}
          {activeMemberId && (
            <KidDayFillForm
              childId={activeMemberId}
              date={today}
              fillMode={fillMode as 1 | 2 | 3}
              dayType={dayType}
              existingDay={todayDay}
              onSaved={handleFillSaved}
            />
          )}
        </>
      ) : (
        // ─── Day filled summary ───
        <div style={{ paddingBottom: 110 }}>
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{
              background: `linear-gradient(135deg, ${T.teal} 0%, #3DB8B0 100%)`,
              borderRadius: 28, padding: 20, position: 'relative', overflow: 'hidden',
              boxShadow: `0 10px 30px ${T.teal}40`,
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}/>
              <div style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1.5, position: 'relative' }}>СЕГОДНЯ ЗАПОЛНЕНО ✓</div>
              <div style={{ fontFamily: T.fDisp, fontSize: 26, fontWeight: 900, color: '#fff', marginTop: 4, position: 'relative' }}>Отличная работа! 🎉</div>
              <div style={{ fontFamily: T.fBody, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, position: 'relative' }}>{todayLabel()}</div>
              <button onClick={() => setEditMode(true)} style={{
                marginTop: 14, height: 40, padding: '0 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, position: 'relative',
              }}>✏️ Редактировать</button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0' }}>
            <div style={{
              flex: 1, background: '#fff', borderRadius: 22, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              border: `1.5px solid ${T.sunDeep}`, boxShadow: `0 4px 14px rgba(0,0,0,0.04)`,
            }}>
              <Coin size={26}/>
              <div>
                <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700 }}>БАЛАНС</div>
                <div style={{ fontFamily: T.fNum, fontSize: 20, fontWeight: 800, color: T.ink }}>
                  <AnimatedNum value={coins}/>
                </div>
              </div>
            </div>
            <div style={{
              flex: 1, background: '#fff', borderRadius: 22, padding: '14px 16px',
              border: `1.5px solid ${T.line}`, boxShadow: `0 4px 14px rgba(0,0,0,0.04)`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 22 }}>🔥</div>
              <div>
                <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700 }}>СЕРИЯ</div>
                <div style={{ fontFamily: T.fNum, fontSize: 20, fontWeight: 800, color: T.coral }}>{streakDays} дн.</div>
              </div>
            </div>
          </div>

          {/* Mood display */}
          {todayDay?.mood && (
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ background: '#fff', borderRadius: 20, padding: '14px 16px', border: `1.5px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 32 }}>
                  {todayDay.mood === 'happy' ? '😄' : todayDay.mood === 'neutral' || todayDay.mood === 'meh' ? '🙂' : todayDay.mood === 'sad' ? '😔' : todayDay.mood === 'tired' ? '😴' : '😐'}
                </div>
                <div>
                  <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>Настроение отмечено</div>
                  <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginTop: 2 }}>Молодец что заполнил день!</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
