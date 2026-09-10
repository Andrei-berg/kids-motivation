'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import FamilyFeed from '@/components/feed/FamilyFeed'
import ScreenHeader from '@/components/kid/design/ScreenHeader'
import { K } from '@/components/kid/design/kidTheme'
import { getWalletSettings, getWallet } from '@/lib/repositories/wallet.repo'
import { getChild } from '@/lib/repositories/children.repo'
import { markFeedSeen } from '@/lib/repositories/feed.repo'
import { useT } from '@/lib/i18n'
import type { Child } from '@/lib/models/child.types'

export default function KidFeedPage() {
  const router = useRouter()
  const t = useT()
  const activeMemberId = useAppStore((s) => s.activeMemberId)
  const [ready, setReady] = useState(false)
  const [child, setChild] = useState<Child | null>(null)
  const [coins, setCoins] = useState(0)
  const [familyId, setFamilyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getWalletSettings()
      .then((s) => {
        if (cancelled) return
        if (s.feed_enabled === false || s.feed_visible_to_kids === false) {
          router.replace('/kid/day')
        } else {
          setReady(true)
        }
      })
      .catch(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    if (!activeMemberId) return
    let cancelled = false
    Promise.all([
      getChild(activeMemberId).catch(() => null),
      getWallet(activeMemberId).catch(() => null),
      supabase.from('family_members').select('family_id').eq('child_id', activeMemberId).maybeSingle(),
    ]).then(([c, w, m]) => {
      if (cancelled) return
      setChild(c)
      setCoins(w?.coins ?? 0)
      const fid = m.data?.family_id ?? null
      setFamilyId(fid)
      if (fid) markFeedSeen(fid)
    })
    return () => { cancelled = true }
  }, [activeMemberId])

  // Keep the tab badge clear while the kid is looking at the feed.
  useEffect(() => {
    if (!familyId) return
    const tick = () => markFeedSeen(familyId)
    const id = setInterval(tick, 15000)
    return () => { clearInterval(id); markFeedSeen(familyId) }
  }, [familyId])

  if (!ready) return null

  return (
    <div style={{ minHeight: '100vh', background: K.cream, paddingBottom: 90 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: `1px solid ${K.line}`, background: K.cream }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <ScreenHeader title={t('kidHeader.feed')} coins={coins} name={child?.name ?? ''} child={child} />
        </div>
      </div>
      <FamilyFeed variant="kid" hideHeader />
    </div>
  )
}
