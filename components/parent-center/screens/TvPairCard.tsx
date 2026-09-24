'use client'

// Settings → Family: pair a TV (Google TV Streamer) with a code, list / unpair TVs.
// The TV opens /tv, shows a 6-digit code; the parent types it here.

import { useCallback, useEffect, useState } from 'react'
import { T } from '../tokens'
import { Card, Btn, Field } from '../ui'

type Device = { id: string; name: string; created_at: string; last_seen_at: string | null }

function seen(iso: string | null) {
  if (!iso) return 'ещё не выходил на связь'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return min < 3 ? 'онлайн' : min < 60 ? `был ${min} мин назад` : `был ${new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
}

export default function TvPairCard({ notify }: { notify: (msg: string, tone?: string) => void }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/tv/devices').then(x => x.json()).catch(() => null)
    if (r?.devices) setDevices(r.devices)
  }, [])
  useEffect(() => { load() }, [load])

  async function claim() {
    setBusy(true)
    try {
      const r = await fetch('/api/tv/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, name }) })
      const j = await r.json()
      if (!r.ok) return notify(j.error ?? 'Не удалось подключить', 'danger')
      setCode(''); setName(''); notify('Телевизор подключён'); load()
    } finally { setBusy(false) }
  }

  async function unpair(id: string) {
    await fetch(`/api/tv/devices?id=${id}`, { method: 'DELETE' })
    notify('Телевизор отключён'); load()
  }

  return (
    <Card pad={16}>
      <div style={{ fontFamily: T.fHead, fontSize: 17, fontWeight: 700, color: T.text }}>Телевизор</div>
      <p style={{ margin: '4px 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.45 }}>
        Табло успеваемости на большом экране. На телевизоре откройте браузер и перейдите на <b>kids-motivation.vercel.app/tv</b>, затем введите код с экрана.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 130px' }}><Field label="Код с экрана" value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="123456" mono /></div>
        <div style={{ flex: '1 1 130px' }}><Field label="Название" value={name} onChange={setName} placeholder="Гостиная" /></div>
        <Btn variant="primary" onClick={claim} disabled={busy || code.length !== 6}>Подключить</Btn>
      </div>
      {devices.map((d, i) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? `1px solid ${T.cardBorder}` : 'none', marginTop: i ? 0 : 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{d.name}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{seen(d.last_seen_at)}</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => unpair(d.id)}>Отключить</Btn>
        </div>
      ))}
    </Card>
  )
}
