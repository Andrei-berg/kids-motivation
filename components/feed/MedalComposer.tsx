'use client'

// Kid-initiated medal send — bottom sheet: sibling picker (when there is a
// choice), then the 8 locked D-11 phrases. Picking a phrase IS sending; there
// is no confirm step and no freeform text anywhere in this file. Coins are
// always 0 for this flow (D-08) — never render a coin figure or coin glyph here.
//
// Kid-only surface: sources colour/type from `K` directly, no `palette()`
// variant, no daylight tokens. Shell copied from `ProfileSheet.tsx` verbatim
// except the 18px (not 26px) top-corner radius, per UI-SPEC.

import { useEffect, useState } from 'react'
import { sendKidMedal } from '@/app/actions/send-kid-medal'
import { MEDAL_PHRASES } from '@/lib/kid/medal-phrases'
import { K } from '@/components/kid/design/kidTheme'
import type { Child } from '@/lib/models/child.types'

interface MedalComposerProps {
  siblings: Child[]
  onClose: () => void
}

export default function MedalComposer({ siblings, onClose }: MedalComposerProps) {
  const [target, setTarget] = useState<Child | null>(siblings.length === 1 ? siblings[0] : null)
  const [sending, setSending] = useState(false)
  const [capped, setCapped] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSend(phrase: string) {
    if (sending || !target) return
    setSending(true)
    setError(null)
    try {
      const res = await sendKidMedal({ targetChildId: target.id, phrase })
      if (res.success) {
        onClose()
        return
      }
      if (res.error === 'Ты уже отправил медаль сегодня') {
        setCapped(true)
      } else {
        setError(res.error ?? 'Не получилось отправить')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33,49,74,0.5)', zIndex: 240,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: K.cream,
          borderTopLeftRadius: 18, borderTopRightRadius: 18,
          padding: '18px 18px 32px', maxHeight: '90vh', overflowY: 'auto',
          animation: 'slideUp 0.28s cubic-bezier(.2,.9,.3,1.1)',
        }}
      >
        <div style={{ width: 40, height: 4, background: K.line, borderRadius: 999, margin: '0 auto 16px' }} />

        {target === null && (
          <>
            <div style={{ fontFamily: K.fDisp, fontSize: 16, fontWeight: 700, color: K.ink, marginBottom: 12 }}>
              Кому отправить медаль?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {siblings.map(sibling => (
                <button
                  key={sibling.id}
                  type="button"
                  onClick={() => setTarget(sibling)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 14, border: '1.5px solid ' + K.line, background: K.card,
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    background: K.berrySoft,
                  }}>
                    {sibling.emoji || '🙂'}
                  </span>
                  <span style={{ fontFamily: K.fDisp, fontSize: 14, fontWeight: 700, color: K.ink }}>
                    {sibling.name}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {target !== null && !capped && (
          <>
            <div style={{ fontFamily: K.fDisp, fontSize: 16, fontWeight: 700, color: K.ink, marginBottom: 12 }}>
              Отправить медаль {target.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MEDAL_PHRASES.map(phrase => (
                <button
                  key={phrase}
                  type="button"
                  disabled={sending}
                  onClick={() => handleSend(phrase)}
                  style={{
                    textAlign: 'left', padding: '10px 14px', borderRadius: 999,
                    border: '1.5px solid ' + K.berry, background: K.berrySoft, color: K.berryDeep,
                    fontFamily: K.fBody, fontSize: 12, fontWeight: 700,
                    cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.6 : 1,
                  }}
                >
                  {phrase}
                </button>
              ))}
            </div>
            {siblings.length > 1 && (
              <button
                type="button"
                onClick={() => setTarget(null)}
                style={{
                  marginTop: 12, background: 'transparent', border: 'none', padding: 0,
                  color: K.ink3, fontFamily: K.fBody, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ← Другой получатель
              </button>
            )}
            {error && (
              <div style={{ marginTop: 10, fontSize: 12, color: K.danger }}>{error}</div>
            )}
          </>
        )}

        {capped && (
          <>
            <div style={{ fontFamily: K.fBody, fontSize: 14, fontWeight: 400, color: K.ink2 }}>
              Ты уже отправил медаль сегодня
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 16, width: '100%', height: 44, borderRadius: 14, cursor: 'pointer',
                border: '1.5px solid ' + K.line, background: '#fff', color: K.ink,
                fontFamily: K.fDisp, fontSize: 14, fontWeight: 700,
              }}
            >
              Закрыть
            </button>
          </>
        )}
      </div>
    </div>
  )
}
