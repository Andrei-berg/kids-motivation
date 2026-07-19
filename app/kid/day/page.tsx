'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { api, getChildren } from '@/lib/api'
import type { Child } from '@/lib/api'
import { localDateString } from '@/utils/helpers'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { KidDayFillForm, type DaySaveResult } from '@/components/kid/KidDayFillForm'
import { KidChallenges } from '@/components/kid/KidChallenges'
import { getVacationPeriods } from '@/lib/vacation-api'
import { getFamilyCalendar } from '@/lib/repositories/calendar.repo'
import { getDayType } from '@/lib/day-type'
import { getFamilyDayBlocksEnabled, getDayBlocks } from '@/lib/repositories/day-blocks.repo'
import type { DayBlock } from '@/lib/models/day-block.types'
import type { Wallet } from '@/lib/models/wallet.types'
import { T } from '@/components/kid/design/tokens'
import { Avatar, Coin, AnimatedNum, StreakFlame, XPBar } from '@/components/kid/design/atoms'
import { Stamp, useCountUp, LedgerRow } from '@/components/design/atoms'
import { triggerConfetti } from '@/utils/confetti'
import ScreenHeader from '@/components/kid/design/ScreenHeader'
import { useDesktop } from '@/lib/hooks/useDesktop'
import { useT, useLanguage } from '@/lib/i18n'

function todayLabel(language: string): string {
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  return new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hero card: avatar + coins + XP bar */}
      <div className="kid-skeleton" style={{ height: 200, borderRadius: 24 }}/>
      {/* Good-behavior / coin-of-day bar */}
      <div className="kid-skeleton" style={{ height: 56, borderRadius: 16 }}/>
      {/* Day fill form sections: subjects, room, sport */}
      <div className="kid-skeleton" style={{ height: 100, borderRadius: 20 }}/>
      <div className="kid-skeleton" style={{ height: 80, borderRadius: 20 }}/>
      <div className="kid-skeleton" style={{ height: 80, borderRadius: 20 }}/>
      <div className="kid-skeleton" style={{ height: 80, borderRadius: 20 }}/>
    </div>
  )
}

export default function KidDayPage() {
  const t = useT()
  const { language } = useLanguage()
  const { activeMemberId, setActiveMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [todayDay, setTodayDay] = useState<any | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [streaks, setStreaks] = useState<any[]>([])
  const [dayType, setDayType] = useState<'school' | 'weekend' | 'vacation'>('school')
  const [dayBlocksEnabled, setDayBlocksEnabled] = useState(false)
  const [dayBlocks, setDayBlocks] = useState<DayBlock[]>([])
  const [editMode, setEditMode] = useState(false)
  // Server-confirmed result of the most recent day save (05.7-11, D-17) —
  // drives the stamp + day-summary ledger rows; null until the child saves
  // once this session (never derived from the pre-save client estimate).
  const [savedResult, setSavedResult] = useState<DaySaveResult | null>(null)
  const isDesktop = useDesktop()
  // Header balance count-up (05.7-11, D-17): drives ONLY the ScreenHeader
  // balance to the new server-confirmed total; never fed a client estimate.
  // Hook must run unconditionally (before the loading/no-child early returns).
  const headerCoins = useCountUp(wallet?.coins ?? 0)

  const today = localDateString()

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

      // Determine day type. Vacation periods are keyed by family_id (NOT child_id)
      // and may target one child via child_filter — use the shared getDayType helper
      // so the kid screen agrees with day-type.ts everywhere else.
      try {
        const familyId = (childData as any).family_id
        const [vacations, familyCalendar, flagEnabled] = await Promise.all([
          getVacationPeriods(familyId),
          getFamilyCalendar(familyId),
          getFamilyDayBlocksEnabled(familyId),
        ])
        const info = getDayType(today, false, vacations ?? [], resolvedId, undefined, familyCalendar)
        // getDayType can also return 'sick'; the day form only handles these three.
        setDayType(info.type === 'sick' ? 'school' : info.type)

        // Day-blocks (Phase 5.6): load the family's active block config only
        // when the flag is on — flag-off families never fetch it, preserving
        // byte-parity (D-07). KidDayFillForm computes the assembled/visible
        // subset itself via assembleDayBlocks (D-06 shared-assembler parity).
        setDayBlocksEnabled(flagEnabled)
        if (flagEnabled) {
          const blocks = await getDayBlocks(familyId, { childId: resolvedId, activeOnly: true })
          setDayBlocks(blocks)
        } else {
          setDayBlocks([])
        }
      } catch {
        const dow = new Date(today + 'T12:00:00').getDay()
        setDayType(dow === 0 || dow === 6 ? 'weekend' : 'school')
        setDayBlocksEnabled(false)
        setDayBlocks([])
      }
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
      {t('kidDayPage.noChild')}
    </div>
  )

  const coins = wallet?.coins ?? 0
  const level = child?.level ?? 1
  const xp = child?.xp ?? 0
  const xpInLevel = xp % 1000 // XP accumulated toward the next level (1000 per level)
  const streakDays = streaks.reduce((max, s) => Math.max(max, s.current_count), 0)

  function handleFillSaved(result: DaySaveResult) {
    setEditMode(false)
    setSavedResult(result)
    // D-19: confetti reserved for a credited streak source or an XP level-up
    // crossing — never fires for an ordinary award.
    if (result.hasStreak || result.leveledUp) triggerConfetti()
    loadData()
  }

  // Show the form if no day yet OR in edit mode
  const showForm = todayDay === null || editMode

  return (
    <div style={isDesktop ? {
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      minHeight: '100vh',
    } : {
      maxWidth: 500, margin: '0 auto', position: 'relative',
    }}>

      {/* ── LEFT: Stats panel (desktop only) OR inline header (mobile) ── */}
      {isDesktop ? (
        <div style={{
          padding: '32px 24px',
          borderRight: `1.5px solid rgba(0,0,0,0.07)`,
          background: 'rgba(61,190,168,0.03)',
          display: 'flex', flexDirection: 'column', gap: 20,
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}>
          {/* Avatar + greeting */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Avatar size={52} skin="#F5C9A1" hair="#2B1810" shirt={T.coral}/>
            <div>
              <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: T.ink }}>
                {t('kidDayPage.greeting', { name: child?.name ?? '…' })}
              </div>
              <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>
                {t('kidDayPage.levelDay', { level, date: todayLabel(language) })}
              </div>
            </div>
          </div>

          {/* Streak card */}
          <div style={{
            background: `linear-gradient(135deg, ${T.coral}18 0%, rgba(255,217,61,0.10) 100%)`,
            borderRadius: 20, padding: '18px 20px',
            border: `1.5px solid ${T.coral}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 38, lineHeight: 1 }}>🔥</div>
              <div>
                <div style={{ fontFamily: T.fNum, fontSize: 36, fontWeight: 800, color: T.coral, lineHeight: 1 }}>{streakDays}</div>
                <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, marginTop: 2 }}>
                  {t('kidDayPage.streakLabel')}
                </div>
              </div>
            </div>
          </div>

          {/* Coins card */}
          <div style={{
            background: `linear-gradient(135deg, rgba(78,205,196,0.16) 0%, rgba(78,205,196,0.06) 100%)`,
            borderRadius: 20, padding: '18px 20px',
            border: `1.5px solid rgba(78,205,196,0.28)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Coin size={36}/>
              <div>
                <div style={{ fontFamily: T.fNum, fontSize: 36, fontWeight: 800, color: T.teal, lineHeight: 1 }}>
                  <AnimatedNum value={coins}/>
                </div>
                <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, marginTop: 2 }}>
                  {t('kidDayPage.balanceLabel')}
                </div>
              </div>
            </div>
          </div>

          {/* Level + XP card */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '16px 20px',
            border: '1.5px solid rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column', gap: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 32 }}>⭐</div>
              <div>
                <div style={{ fontFamily: T.fNum, fontSize: 30, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{level}</div>
                <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, marginTop: 2 }}>Level</div>
              </div>
            </div>
            <XPBar xp={xpInLevel} max={1000} level={level} compact/>
          </div>

          {/* Day-complete celebration (desktop only, when not in form mode) */}
          {!showForm && (
            <div style={{
              background: `linear-gradient(135deg, ${T.teal} 0%, #3DB8B0 100%)`,
              borderRadius: 20, padding: '18px 20px',
              boxShadow: `0 8px 24px rgba(61,190,168,0.35)`,
            }}>
              <div style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: 1.2 }}>
                {t('kidDayPage.filledToday')}
              </div>
              <div style={{ fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                {t('kidDayPage.greatJob')}
              </div>
              {/* Signature stamp (05.7-11, D-17): fires only after /api/wallet/award
                  resolved this session, keyed to the server-confirmed creditedCoins.
                  Never rendered for an idempotent re-save (creditedCoins === 0). */}
              {savedResult && savedResult.creditedCoins > 0 && (
                <Stamp trigger={savedResult.creditedCoins} style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: T.fNum, fontSize: 24, fontWeight: 900, color: '#fff' }}>
                    +{savedResult.creditedCoins} 🪙
                  </div>
                </Stamp>
              )}
              <button onClick={() => setEditMode(true)} style={{
                marginTop: 12, height: 34, padding: '0 16px', borderRadius: 17,
                background: 'rgba(255,255,255,0.22)', border: 'none', color: '#fff',
                fontFamily: T.fDisp, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}>{t('kidDayPage.editBtn')}</button>
            </div>
          )}

          {/* Day-summary ledger (05.7-11, D-17): awarded items from the
              server-confirmed appliedItems — theme='paper' per UI-SPEC. */}
          {!showForm && savedResult && savedResult.appliedItems.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 20, padding: '16px 20px',
              border: '1.5px solid rgba(0,0,0,0.07)',
              display: 'flex', flexDirection: 'column', gap: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, letterSpacing: 1.2 }}>
                {t('kidDay.awardedHeading')}
              </div>
              {savedResult.appliedItems.map((item, i) => (
                <LedgerRow
                  key={`${item.sourceType}-${i}`}
                  name={item.description}
                  amount={item.coins}
                  tone={item.coins < 0 ? 'penalty' : 'earn'}
                  theme="paper"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Mobile: unified «сберкнижка» header (D-13) with logout (D-03) + XP strip */
        <div>
          <ScreenHeader title={t('kidHeader.day')} coins={headerCoins} name={child?.name ?? ''} showLogout/>
          <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <XPBar xp={xpInLevel} max={1000} level={level} compact/>
            </div>
            <StreakFlame days={streakDays}/>
          </div>
        </div>
      )}

      {/* ── RIGHT (desktop) or full-width (mobile): form / summary ── */}
      <div style={isDesktop ? { padding: '16px 32px 32px', overflowY: 'auto' } : { position: 'relative' }}>
        {/* Desktop: unified «сберкнижка» header (D-13) with logout (D-03) —
            the 4.5 sticky sidebar keeps the stats (D-15) */}
        {isDesktop && (
          <ScreenHeader title={t('kidHeader.day')} coins={headerCoins} name={child?.name ?? ''} showLogout/>
        )}
        {activeMemberId && <KidChallenges childId={activeMemberId}/>}
        {showForm ? (
          <>
            {editMode && todayDay && (
              <div style={{ padding: isDesktop ? '0 0 12px' : '8px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditMode(false)} style={{
                  height: 30, padding: '0 12px', borderRadius: 15,
                  border: `1.5px solid ${T.line}`, background: '#fff',
                  cursor: 'pointer', fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 700,
                }}>{t('kidDayPage.backBtn')}</button>
              </div>
            )}
            {activeMemberId && (
              <KidDayFillForm
                childId={activeMemberId}
                date={today}
                dayType={dayType}
                existingDay={todayDay}
                onSaved={handleFillSaved}
                dayBlocksEnabled={dayBlocksEnabled}
                dayBlocks={dayBlocks}
              />
            )}
          </>
        ) : (
          /* Mobile summary cards — on desktop these are shown in the left stats panel already */
          !isDesktop && (
            <div style={{ paddingBottom: 110 }}>
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{
                  background: `linear-gradient(135deg, ${T.teal} 0%, #3DB8B0 100%)`,
                  borderRadius: 28, padding: 20, position: 'relative', overflow: 'hidden',
                  boxShadow: `0 10px 30px ${T.teal}40`,
                }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}/>
                  <div style={{ fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1.5, position: 'relative' }}>{t('kidDayPage.filledToday')}</div>
                  <div style={{ fontFamily: T.fDisp, fontSize: 26, fontWeight: 900, color: '#fff', marginTop: 4, position: 'relative' }}>{t('kidDayPage.greatJob')}</div>
                  <div style={{ fontFamily: T.fBody, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, position: 'relative' }}>{todayLabel(language)}</div>
                  {/* Signature stamp (05.7-11, D-17): fires only after
                      /api/wallet/award resolved this session, keyed to the
                      server-confirmed creditedCoins. Skipped on an idempotent
                      re-save (creditedCoins === 0). */}
                  {savedResult && savedResult.creditedCoins > 0 && (
                    <Stamp trigger={savedResult.creditedCoins} style={{ position: 'relative', marginTop: 8 }}>
                      <div style={{ fontFamily: T.fNum, fontSize: 22, fontWeight: 900, color: '#fff' }}>
                        +{savedResult.creditedCoins} 🪙
                      </div>
                    </Stamp>
                  )}
                  <button onClick={() => setEditMode(true)} style={{
                    marginTop: 14, height: 40, padding: '0 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                    fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, position: 'relative',
                  }}>{t('kidDayPage.editBtn')}</button>
                </div>
              </div>

              {/* Day-summary ledger (05.7-11, D-17): awarded items from the
                  server-confirmed appliedItems — theme='paper' per UI-SPEC. */}
              {savedResult && savedResult.appliedItems.length > 0 && (
                <div style={{ padding: '14px 16px 0' }}>
                  <div style={{
                    background: '#fff', borderRadius: 20, padding: '14px 16px',
                    border: `1.5px solid ${T.line}`, boxShadow: `0 4px 14px rgba(0,0,0,0.04)`,
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700 }}>
                      {t('kidDay.awardedHeading')}
                    </div>
                    {savedResult.appliedItems.map((item, i) => (
                      <LedgerRow
                        key={`${item.sourceType}-${i}`}
                        name={item.description}
                        amount={item.coins}
                        tone={item.coins < 0 ? 'penalty' : 'earn'}
                        theme="paper"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0' }}>
                <div style={{
                  flex: 1, background: '#fff', borderRadius: 22, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: `1.5px solid ${T.sunDeep}`, boxShadow: `0 4px 14px rgba(0,0,0,0.04)`,
                }}>
                  <Coin size={26}/>
                  <div>
                    <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700 }}>{t('kidDayPage.balanceLabel')}</div>
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
                    <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, fontWeight: 700 }}>{t('kidDayPage.streakLabel')}</div>
                    <div style={{ fontFamily: T.fNum, fontSize: 20, fontWeight: 800, color: T.coral }}>{t('kidDayPage.streakDays', { count: streakDays })}</div>
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
                      <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>{t('kidDayPage.moodLabel')}</div>
                      <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginTop: 2 }}>{t('kidDayPage.moodNote')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
