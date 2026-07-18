'use client'

// components/kid/GoalsPanel.tsx
// Kid savings goal, framed as a "вклад" (deposit) per D-16: pick a dream + target,
// watch the coins fill toward it, and celebrate when reached with a Stamp ceremony
// (D-20 — confetti retired). Completion latches the milestone and unlocks the goal
// badges (goal_achiever / goals_3 / goals_5). Goals never move money — progress is
// just the child's current wallet balance.

import { useState, useEffect, useCallback } from 'react'
import { getGoals, createGoal, archiveGoal, completeGoalsIfReached, getCompletedGoalCount } from '@/lib/repositories/children.repo'
import { checkGoalBadges } from '@/lib/services/badges.service'
import { T } from '@/components/kid/design/tokens'
import { base, paper } from '@/lib/design/tokens'
import { ProgressRing } from '@/components/kid/design/atoms'
import { Amount, Stamp } from '@/components/design/atoms'
import { useT } from '@/lib/i18n'

const EMOJIS = ['🎮', '🚲', '🎧', '📱', '⚽', '🎸', '🛹', '🎨', '📚', '🦄', '🎁', '🎯']

// Rubber-stamp plaque (D-20): tilted −8°, success tone — completion is a
// status signal, not money (gold) or navigation (indigo).
function StampPlaque({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '3px 10px' : '10px 18px',
      border: `${small ? 2 : 3}px solid ${paper.successText}`,
      borderRadius: small ? 8 : 10,
      color: paper.successText,
      fontFamily: base.fontDisplay,
      fontSize: small ? 12 : 20,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      transform: 'rotate(-8deg)',
    }}>
      {label}
    </span>
  )
}

export default function GoalsPanel({ childId, coins }: { childId: string; coins: number }) {
  const t = useT()
  const [goal, setGoal] = useState<any | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ emoji: '🎮', title: '', target: '' })
  const [justDone, setJustDone] = useState<any | null>(null)

  const refresh = useCallback(async () => {
    // Latch any goal whose target the savings have reached, then load state.
    const done = await completeGoalsIfReached(childId, coins)
    if (done.length > 0) {
      await checkGoalBadges(childId)
      setJustDone(done[0])
    }
    const [{ all }, count] = await Promise.all([getGoals(childId), getCompletedGoalCount(childId)])
    setCompletedCount(count)
    setGoal((all ?? []).find((g: any) => g.active && !g.archived) ?? null)
  }, [childId, coins])

  useEffect(() => { refresh() }, [refresh])

  async function submit() {
    const target = Number(form.target)
    if (!form.title.trim() || !target || target <= 0) return
    await createGoal({ childId, title: form.title.trim(), target, emoji: form.emoji })
    setCreating(false)
    setForm({ emoji: '🎮', title: '', target: '' })
    refresh()
  }

  async function changeGoal() {
    if (goal) await archiveGoal(goal.id, childId)
    setGoal(null)
    setCreating(true)
  }

  const target = goal?.target ?? 0
  const completed = goal?.completed ?? false
  const current = completed ? target : Math.min(coins, target)
  const pct = target > 0 ? Math.round((current / target) * 100) : 0
  const remaining = Math.max(0, target - coins)

  return (
    <div style={{ padding: '22px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>{t('goals.heading')}</h3>
        {completedCount > 0 && (
          <span style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 700 }}>{t('goals.doneCount', { count: completedCount })}</span>
        )}
      </div>

      {goal ? (
        <div style={{
          background: paper.card,
          borderRadius: 20, padding: 18,
          border: `1px solid ${completed ? paper.success : paper.line}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden',
        }}>
          <ProgressRing pct={pct} size={92} stroke={10} color={completed ? paper.successText : paper.accent} bg={paper.lineSoft}>
            <div style={{ fontSize: 34 }}>{goal.emoji ?? '🎯'}</div>
          </ProgressRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: base.fontDisplay, fontSize: 18, fontWeight: 700, color: paper.ink, lineHeight: 1.2 }}>
              {goal.title}
            </div>
            {completed ? (
              <div style={{ marginTop: 8 }}>
                <StampPlaque label={t('stamp.goalReached')} small/>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4, whiteSpace: 'nowrap' }}>
                  <Amount value={current} theme="paper" money size="md"/>
                  <span style={{ fontFamily: base.fontBody, fontSize: 13, fontWeight: 500, color: paper.ink3 }}>/</span>
                  <Amount value={target} theme="paper" money size="sm"/>
                  <span style={{ fontSize: 13 }} aria-hidden>🪙</span>
                </div>
                <div style={{ fontFamily: base.fontBody, fontSize: 12, color: paper.ink3, fontWeight: 600, marginTop: 2 }}>
                  {t('goals.left', { n: remaining.toLocaleString('ru-RU') })}
                </div>
                <button onClick={changeGoal} style={{
                  marginTop: 6, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: base.fontBody, fontSize: 11, fontWeight: 700, color: paper.accent,
                }}>{t('goals.changeGoal')}</button>
              </>
            )}
          </div>
          {completed && (
            <button onClick={() => setCreating(true)} style={{
              height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: paper.accent, color: '#fff', fontFamily: base.fontBody, fontSize: 12, fontWeight: 700,
            }}>{t('goals.newGoal')}</button>
          )}
        </div>
      ) : (
        <button onClick={() => setCreating(true)} style={{
          width: '100%', borderRadius: 20, padding: '22px 18px', cursor: 'pointer',
          background: paper.card, border: `1.5px dashed ${paper.accent}55`,
          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `${paper.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: base.fontDisplay, fontSize: 16, fontWeight: 700, color: paper.ink }}>{t('goals.setGoalTitle')}</div>
            <div style={{ fontFamily: base.fontBody, fontSize: 12, color: paper.ink3, fontWeight: 600, marginTop: 2 }}>{t('goals.setGoalSub')}</div>
          </div>
          <div style={{ fontSize: 22, color: paper.accent }}>＋</div>
        </button>
      )}

      {/* Create modal */}
      {creating && (
        <div onClick={() => setCreating(false)} style={{
          position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 500, background: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '20px 20px 32px',
            animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.1)',
          }}>
            <div style={{ width: 40, height: 4, background: T.line, borderRadius: 999, margin: '0 auto 16px' }}/>
            <div style={{ fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, marginBottom: 14 }}>{t('goals.setGoalTitle')}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{
                  height: 44, borderRadius: 14, cursor: 'pointer', fontSize: 22,
                  background: form.emoji === e ? `${T.plum}18` : T.lineSoft,
                  border: form.emoji === e ? `2px solid ${T.plum}` : `1.5px solid ${T.line}`,
                }}>{e}</button>
              ))}
            </div>

            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('goals.namePlaceholder')} style={{
              height: 48, width: '100%', boxSizing: 'border-box', padding: '0 16px', borderRadius: 16,
              border: `1.5px solid ${T.line}`, background: T.lineSoft, fontFamily: T.fBody, fontSize: 15, color: T.ink, outline: 'none', marginBottom: 10,
            }}/>
            <input type="number" inputMode="numeric" min="1" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder={t('goals.targetPlaceholder')} style={{
              height: 48, width: '100%', boxSizing: 'border-box', padding: '0 16px', borderRadius: 16,
              border: `1.5px solid ${T.line}`, background: T.lineSoft, fontFamily: T.fNum, fontSize: 16, fontWeight: 700, color: T.ink, outline: 'none', marginBottom: 16,
            }}/>

            <button onClick={submit} disabled={!form.title.trim() || !Number(form.target)} style={{
              width: '100%', height: 52, borderRadius: 26, border: 'none',
              cursor: (!form.title.trim() || !Number(form.target)) ? 'not-allowed' : 'pointer',
              opacity: (!form.title.trim() || !Number(form.target)) ? 0.5 : 1,
              background: `linear-gradient(135deg, ${T.plum}, #5A4BD0)`, color: '#fff',
              fontFamily: T.fDisp, fontSize: 16, fontWeight: 900,
            }}>{t('goals.createBtn')}</button>
          </div>
        </div>
      )}

      {/* Completion celebration — Stamp ceremony (D-20), confetti retired */}
      {justDone && (
        <div onClick={() => setJustDone(null)} style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(36,30,56,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 340, borderRadius: 24, padding: '28px 22px', textAlign: 'center',
            background: paper.card, border: `1px solid ${paper.line}`,
            boxShadow: '0 18px 48px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 64, lineHeight: 1 }}>{justDone.emoji ?? '🎯'}</div>
            <div style={{ fontFamily: base.fontBody, fontSize: 15, color: paper.ink2, fontWeight: 600, marginTop: 10 }}>{justDone.title}</div>
            <div style={{ marginTop: 16 }}>
              <Stamp trigger={justDone.id}>
                <StampPlaque label={t('stamp.goalReached')}/>
              </Stamp>
            </div>
            <button onClick={() => setJustDone(null)} style={{
              marginTop: 22, width: '100%', height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
              background: paper.accent, color: '#fff', fontFamily: base.fontDisplay, fontSize: 15, fontWeight: 700,
            }}>{t('goals.hooray')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
