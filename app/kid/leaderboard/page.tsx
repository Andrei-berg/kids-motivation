'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { getChildBadges } from '@/lib/services/badges.service'
import { useAppStore } from '@/lib/store'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import { T } from '@/components/kid/design/tokens'
import { Avatar, KMButton } from '@/components/kid/design/atoms'

interface Entry {
  id: string; name: string; level: number; xp: number; coins: number
  weekScore: number; badgeCount: number; longestStreak: number
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[200, 160, 200].map((h, i) => (
        <div key={i} className="kid-skeleton" style={{ height: h, borderRadius: 24 }}/>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [range, setRange] = useState<'week' | 'month' | 'all-time'>('week')

  useEffect(() => {
    if (!activeMemberId) return
    const load = async () => {
      setLoading(true)
      try {
        const today = normalizeDate(new Date())
        const weekStart = getWeekRange(today).start
        const { createClient } = await import('@/lib/supabase/client')
        const { data: members } = await createClient()
          .from('family_members')
          .select('child_id')
          .eq('role', 'child')
          .not('child_id', 'is', null)
        const childIds = (members ?? []).map((m: any) => m.child_id).filter(Boolean)
        const data = await Promise.all(childIds.map(async (id: string) => {
          const [child, wallet, weekScore, badges, streaks] = await Promise.all([
            api.getChild(id).catch(() => null),
            getWallet(id).catch(() => null),
            api.getWeekScore(id, weekStart).catch(() => 0),
            getChildBadges(id).catch(() => []),
            api.getStreaks(id).catch(() => []),
          ])
          if (!child) return null
          const best = (streaks as any[]).reduce((m: number, s: any) => Math.max(m, s.best_count), 0)
          return { id, name: child.name, level: child.level ?? 1, xp: child.xp ?? 0, coins: wallet?.coins ?? 0, weekScore: weekScore ?? 0, badgeCount: badges.length, longestStreak: best }
        }))
        setEntries(data.filter(Boolean) as Entry[])
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [activeMemberId])

  if (loading) return <LoadingSkeleton/>

  const me = entries.find(e => e.id === activeMemberId) ?? entries[0]
  const sibling = entries.find(e => e.id !== activeMemberId)

  if (!me) return (
    <div style={{ padding: 32, textAlign: 'center', color: T.ink3, fontFamily: T.fBody }}>Нет данных</div>
  )

  const stats = [
    { k: 'Монет (нед.)', me: me.weekScore, them: sibling?.weekScore ?? 0, icon: '💰', col: T.sunDeep },
    { k: 'XP всего',     me: me.xp,        them: sibling?.xp ?? 0,        icon: '⚡', col: T.plum   },
    { k: 'Монет всего',  me: me.coins,      them: sibling?.coins ?? 0,     icon: '🏦', col: T.teal   },
    { k: 'Значков',      me: me.badgeCount, them: sibling?.badgeCount ?? 0, icon: '🏆', col: T.coral  },
    { k: 'Рекорд серии', me: me.longestStreak, them: sibling?.longestStreak ?? 0, icon: '🔥', col: T.pink },
  ]
  const wins = sibling ? stats.filter(s => s.me > s.them).length : stats.length

  return (
    <div style={{ paddingBottom: 110, maxWidth: 500, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ borderRadius: 28, padding: '20px 16px 16px', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, #1A1423 0%, #3D2B5C 100%)`, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(${T.coral}50, transparent 65%)`, filter: 'blur(30px)' }}/>
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(${T.teal}50, transparent 65%)`, filter: 'blur(30px)' }}/>
          <div style={{ textAlign: 'center', fontFamily: T.fBody, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 1.5, marginBottom: 14, position: 'relative' }}>СЕМЕЙНЫЙ РЕЙТИНГ</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, position: 'relative' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar size={72} skin="#F5C9A1" hair="#2B1810" shirt={T.coral}/>
                <div style={{ position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${T.sun}, ${T.sunDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: '2px solid #1A1423' }}>👑</div>
              </div>
              <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: '#fff', marginTop: 6 }}>{me.name}</div>
              <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.sun, fontWeight: 800, letterSpacing: 0.5 }}>
                {sibling ? `ЛИДЕР · ${wins}/${stats.length}` : 'ТЫ'}
              </div>
            </div>
            {sibling && (
              <>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(135deg, ${T.coral}, ${T.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: '#fff', boxShadow: '0 6px 16px rgba(0,0,0,0.4)', border: '2px solid #fff' }}>VS</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <Avatar size={72} skin="#E8B088" hair="#4A2817" shirt={T.teal}/>
                  <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: '#fff', marginTop: 6 }}>{sibling.name}</div>
                  <div style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 0.5 }}>УР. {sibling.level}</div>
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 3, padding: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 999, position: 'relative' }}>
            {(['week', 'month', 'all-time'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{ flex: 1, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', background: range === r ? '#fff' : 'transparent', color: range === r ? T.ink : 'rgba(255,255,255,0.7)', fontFamily: T.fDisp, fontSize: 11, fontWeight: 800 }}>
                {r === 'week' ? 'Неделя' : r === 'month' ? 'Месяц' : 'Всё время'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      {sibling && (
        <div style={{ padding: '18px 16px 0' }}>
          <h3 style={{ margin: '0 0 12px', fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>Сравнение</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.map(s => {
              const total = s.me + s.them
              const mePct = total === 0 ? 50 : (s.me / total) * 100
              const meWins = s.me > s.them
              return (
                <div key={s.k} style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', border: `1.5px solid ${T.line}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: s.col + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.icon}</div>
                    <span style={{ flex: 1, fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, color: T.ink }}>{s.k}</span>
                    {meWins && <span style={{ padding: '2px 8px', borderRadius: 999, background: T.coralSoft, color: T.coralDeep, fontFamily: T.fDisp, fontSize: 10, fontWeight: 900 }}>ТЫ ЛИДЕР</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: T.fNum, fontSize: 13, fontWeight: 800, color: T.coral, width: 44, textAlign: 'right' }}>{s.me.toLocaleString('ru-RU')}</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 999, display: 'flex', background: T.lineSoft, overflow: 'hidden' }}>
                      <div style={{ width: `${mePct}%`, background: `linear-gradient(90deg, ${T.coral}, ${T.coralDeep})`, borderRadius: '999px 0 0 999px' }}/>
                      <div style={{ width: `${100 - mePct}%`, background: `linear-gradient(90deg, ${T.tealDeep}, ${T.teal})`, borderRadius: '0 999px 999px 0' }}/>
                    </div>
                    <span style={{ fontFamily: T.fNum, fontSize: 13, fontWeight: 800, color: T.tealDeep, width: 44 }}>{s.them.toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cheer */}
      {sibling ? (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ background: `linear-gradient(135deg, ${T.tealSoft}, #C6F0EB)`, borderRadius: 20, padding: 16, display: 'flex', gap: 12, alignItems: 'center', border: `1.5px solid ${T.teal}30` }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💪</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 900, color: T.ink }}>Поддержи {sibling.name}!</div>
              <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink2, marginTop: 2 }}>Оба получите +10 монет за поддержку ⭐</div>
            </div>
            <KMButton tone="teal" size="sm">Послать ⭐</KMButton>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 16px 0', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 32, border: `1.5px solid ${T.line}` }}>
            <div style={{ fontSize: 40 }}>👥</div>
            <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 800, color: T.ink3, marginTop: 12 }}>Нет других участников</div>
          </div>
        </div>
      )}
    </div>
  )
}
