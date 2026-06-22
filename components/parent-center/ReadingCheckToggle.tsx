'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { setRequireReadingCheckAction } from '@/app/parent/reading/actions'
import { useT } from '@/lib/i18n'
import { T } from './tokens'
import { Card } from './ui'

// Per-child flexibility: require parent confirmation of finished-book claims.
// Default on for everyone; turn off for a child you trust to read on their own.
export function ReadingCheckToggle({ childId }: { childId: string }) {
  const t = useT()
  const [on, setOn] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.from('children').select('require_reading_check').eq('id', childId).maybeSingle()
      .then(({ data }) => { if (alive) { setOn((data as any)?.require_reading_check ?? true); setReady(true) } })
    return () => { alive = false }
  }, [childId])

  async function toggle() {
    const next = !on
    setOn(next)
    try { await setRequireReadingCheckAction(childId, next) } catch { setOn(!next) }
  }

  return (
    <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 22 }}>📖</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{t('parentCenter.readingCheck.title')}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{t('parentCenter.readingCheck.sub')}</div>
      </div>
      <button onClick={toggle} disabled={!ready} aria-label={t('parentCenter.readingCheck.title')} style={{
        width: 46, height: 28, borderRadius: 999, border: 'none', cursor: ready ? 'pointer' : 'default',
        background: on ? T.indigo : T.cardBorder, position: 'relative', flexShrink: 0, transition: 'background .2s',
        opacity: ready ? 1 : 0.5,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%',
          background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}/>
      </button>
    </Card>
  )
}
