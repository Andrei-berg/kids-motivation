'use client'

import { useState, useEffect, useCallback } from 'react'
import { getParentGoals, createParentGoal, archiveParentGoal, type ParentGoal } from '@/lib/repositories/children.repo'
import { completeParentGoalAction } from '@/app/parent/goals/actions'
import { useT } from '@/lib/i18n'
import { T } from './tokens'
import { Card, Btn } from './ui'

const EMOJIS = ['🎯', '📚', '🧹', '💪', '🎮', '🚲', '🏆', '⭐', '🎨', '🦷']

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  const d = new Date(deadline + 'T23:59:59')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export default function ParentGoals({ childId, notify }: { childId: string; notify?: (m: string, tone?: string) => void }) {
  const t = useT()
  const [goals, setGoals] = useState<ParentGoal[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<{ emoji: string; title: string; deadline: string; rewardType: 'coins' | 'prize'; rewardCoins: string; rewardText: string }>({
    emoji: '🎯', title: '', deadline: '', rewardType: 'coins', rewardCoins: '', rewardText: '',
  })

  const refresh = useCallback(async () => { setGoals(await getParentGoals(childId)) }, [childId])
  useEffect(() => { refresh() }, [refresh])

  async function submit() {
    if (!form.title.trim()) return
    if (form.rewardType === 'coins' && !Number(form.rewardCoins)) return
    if (form.rewardType === 'prize' && !form.rewardText.trim()) return
    await createParentGoal({
      childId, title: form.title.trim(), emoji: form.emoji,
      deadline: form.deadline || null, rewardType: form.rewardType,
      rewardCoins: Number(form.rewardCoins) || 0, rewardText: form.rewardText.trim() || null,
    })
    setForm({ emoji: '🎯', title: '', deadline: '', rewardType: 'coins', rewardCoins: '', rewardText: '' })
    setCreating(false)
    refresh()
  }

  async function complete(g: ParentGoal) {
    try {
      const res = await completeParentGoalAction(g.id)
      notify?.(res.rewardType === 'coins' ? `${g.title} ✓ +${res.creditedCoins}🪙` : `${g.title} ✓ ${res.rewardText ?? ''}`)
      refresh()
    } catch (e: any) { notify?.(`Failed: ${e?.message ?? 'error'}`, 'danger') }
  }

  async function remove(g: ParentGoal) {
    await archiveParentGoal(g.id)
    refresh()
  }

  const rewardLabel = (g: ParentGoal) =>
    g.reward_type === 'coins' ? `${g.reward_coins ?? 0} 🪙` : (g.reward_text || '🎁')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!creating && (
        <Btn variant="solid" size="sm" icon="plus" onClick={() => setCreating(true)}>{t('parentGoals.newGoal')}</Btn>
      )}

      {creating && (
        <Card pad={14} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{
                width: 38, height: 38, borderRadius: 10, fontSize: 19, cursor: 'pointer',
                background: form.emoji === e ? T.indigoSoft : T.cardHi,
                border: `1px solid ${form.emoji === e ? T.indigo : T.cardBorder}`,
              }}>{e}</button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t('parentGoals.titlePlaceholder')} style={inp} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: T.muted }}>{t('parentGoals.deadline')}</span>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ ...inp, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['coins', 'prize'] as const).map(rt => (
              <button key={rt} onClick={() => setForm(f => ({ ...f, rewardType: rt }))} style={{
                flex: 1, height: 38, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: form.rewardType === rt ? T.indigo : T.cardHi, color: form.rewardType === rt ? '#fff' : T.text,
                border: `1px solid ${form.rewardType === rt ? T.indigo : T.cardBorder}`,
              }}>{t(`parentGoals.reward_${rt}`)}</button>
            ))}
          </div>
          {form.rewardType === 'coins' ? (
            <input type="number" inputMode="numeric" min="1" value={form.rewardCoins}
              onChange={e => setForm(f => ({ ...f, rewardCoins: e.target.value }))} placeholder={t('parentGoals.coinsPlaceholder')} style={inp} />
          ) : (
            <input value={form.rewardText} onChange={e => setForm(f => ({ ...f, rewardText: e.target.value }))}
              placeholder={t('parentGoals.prizePlaceholder')} style={inp} />
          )}
          <div style={{ fontSize: 11, color: T.muted }}>{t('parentGoals.coinsHint')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => setCreating(false)}>{t('parentGoals.cancel')}</Btn>
            <Btn variant="solid" size="sm" onClick={submit}>{t('parentGoals.create')}</Btn>
          </div>
        </Card>
      )}

      {goals.map(g => {
        const dl = daysLeft(g.deadline)
        const overdue = !g.completed && dl !== null && dl < 0
        return (
          <Card key={g.id} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: g.completed ? 0.7 : 1 }}>
            <div style={{ fontSize: 26 }}>{g.emoji ?? '🎯'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{g.title}</div>
              <div style={{ fontSize: 11, color: overdue ? T.danger : T.muted, marginTop: 2 }}>
                🎁 {rewardLabel(g)}
                {g.completed ? ` · ${t('parentGoals.done')}` :
                  dl === null ? '' : overdue ? ` · ${t('parentGoals.overdue')}` : ` · ${t('parentGoals.daysLeft').replace('{n}', String(dl))}`}
              </div>
            </div>
            {!g.completed && <Btn variant="solid" size="sm" onClick={() => complete(g)}>{t('parentGoals.markDone')}</Btn>}
            <button onClick={() => remove(g)} title={t('parentGoals.delete')} style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: T.muted,
              background: 'transparent', border: `1px solid ${T.cardBorder}`,
            }}>✕</button>
          </Card>
        )
      })}

      {goals.length === 0 && !creating && (
        <Card pad={20} style={{ textAlign: 'center', color: T.muted, fontSize: 13 }}>{t('parentGoals.empty')}</Card>
      )}
    </div>
  )
}

const inp: React.CSSProperties = {
  height: 40, padding: '0 12px', borderRadius: 10, width: '100%', boxSizing: 'border-box',
  background: T.cardHi, border: `1px solid ${T.cardBorder}`, color: T.text, fontSize: 14, outline: 'none',
}
