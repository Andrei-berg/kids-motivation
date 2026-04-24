'use client'

import { useState, useEffect } from 'react'
import { T } from '../tokens'
import { Icon, Field, Btn } from '../ui'
import type { ParentChild, ActionType } from '../types'

type Props = {
  open: boolean
  child: ParentChild | null
  action: ActionType | null
  onClose: () => void
  onConfirm: (data: { child: ParentChild; action: ActionType; amount: number; reason: string }) => void
}

export default function ActionModal({ open, child, action, onClose, onConfirm }: Props) {
  const [amount, setAmount] = useState(5)
  const [reason, setReason] = useState('')
  const [preset, setPreset] = useState<string | null>(null)

  useEffect(() => {
    if (open && action) {
      const defaults: Record<ActionType, number> = { reward: 5, penalty: -3, bonus: 50, freeze: 0 }
      setAmount(defaults[action])
      setReason('')
      setPreset(null)
    }
  }, [open, action])

  if (!open || !child || !action) return null

  type ActionCfg = {
    title: string; color: string; icon: string
    presets: { l: string; v: number }[]
  }
  const cfgMap: Record<ActionType, ActionCfg> = {
    reward: {
      title: `Reward ${child.name}`, color: T.success, icon: '🌟',
      presets: [
        { l: 'Grade 5', v: 5 }, { l: 'Grade 4', v: 3 },
        { l: 'Room', v: 3 }, { l: 'Exercise', v: 5 },
        { l: 'Behavior', v: 5 }, { l: 'Extra help', v: 2 },
      ],
    },
    penalty: {
      title: `Penalty for ${child.name}`, color: T.danger, icon: '⚠️',
      presets: [
        { l: 'Grade 3', v: -3 }, { l: 'Grade 2', v: -5 }, { l: 'Grade 1', v: -10 },
        { l: 'Missed task', v: -3 }, { l: 'Bad behavior', v: -5 },
      ],
    },
    bonus: {
      title: `Bonus for ${child.name}`, color: T.indigo, icon: '💰',
      presets: [
        { l: 'Small', v: 25 }, { l: 'Medium', v: 50 },
        { l: 'Large', v: 100 }, { l: 'Challenge won', v: 200 },
      ],
    },
    freeze: {
      title: `Freeze ${child.name}'s streak`, color: T.cyan, icon: '❄️',
      presets: [{ l: '1 day', v: 1 }, { l: '2 days', v: 2 }, { l: 'Weekend', v: 2 }],
    },
  }
  const cfg = cfgMap[action]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      zIndex: 150, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: T.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${T.cardBorderHi}`, borderBottom: 'none',
        padding: '16px 16px 24px',
      }}>
        <div style={{ width: 34, height: 4, background: T.faint, borderRadius: 2, margin: '0 auto 14px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: T.rM,
            background: `${cfg.color}20`, border: `1px solid ${cfg.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>{cfg.icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontFamily: T.fHead, fontSize: 18, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{cfg.title}</h3>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Pick a preset or customize</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: T.cardHi, border: `1px solid ${T.cardBorder}`,
            color: T.text, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="x" size={14}/></button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {cfg.presets.map(p => {
            const active = preset === p.l
            return (
              <button key={p.l} onClick={() => { setPreset(p.l); setAmount(p.v) }} style={{
                padding: '8px 12px',
                background: active ? `${cfg.color}22` : T.bg1,
                border: `1px solid ${active ? cfg.color + '55' : T.cardBorder}`,
                borderRadius: T.rPill, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: T.fBody, fontSize: 12, fontWeight: 600,
                color: active ? cfg.color : T.textDim, transition: 'all .15s',
              }}>
                {p.l}
                <span style={{ fontFamily: T.fMono, fontWeight: 700 }}>
                  {p.v > 0 ? '+' : ''}{p.v}{action === 'freeze' ? 'd' : '🪙'}
                </span>
              </button>
            )
          })}
        </div>

        {action !== 'freeze' && (
          <>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Amount</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 14,
              background: T.bg1, border: `1px solid ${T.cardBorder}`,
              borderRadius: T.rM, marginBottom: 14,
            }}>
              <button onClick={() => setAmount(a => a - 1)} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: T.cardHi, color: T.text, cursor: 'pointer', fontSize: 18, fontWeight: 600,
              }}>−</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                  style={{
                    width: '100%', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none',
                    color: amount >= 0 ? T.success : T.danger, fontFamily: T.fMono, fontSize: 28, fontWeight: 700,
                  }}/>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>coins</div>
              </div>
              <button onClick={() => setAmount(a => a + 1)} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: T.cardHi, color: T.text, cursor: 'pointer', fontSize: 18, fontWeight: 600,
              }}>+</button>
            </div>
          </>
        )}

        <Field label="Reason (optional)" value={reason} onChange={setReason} placeholder="Write a short note…"/>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" size="lg" onClick={onClose} full>Cancel</Btn>
          <Btn variant="primary" size="lg" icon="check" full
            onClick={() => { onConfirm({ child, action, amount, reason }); onClose() }}
            style={{ background: cfg.color, borderColor: cfg.color }}>
            Confirm
          </Btn>
        </div>
      </div>
    </div>
  )
}
