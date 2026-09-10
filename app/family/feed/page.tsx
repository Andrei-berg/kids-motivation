'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FamilyFeed from '@/components/feed/FamilyFeed'
import { getWalletSettings } from '@/lib/repositories/wallet.repo'

export default function FamilyFeedPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getWalletSettings()
      .then(s => {
        if (s.feed_enabled === false) router.replace('/family')
        else setReady(true)
      })
      .catch(() => setReady(true))
  }, [router])

  if (!ready) return null
  return (
    <div style={{ minHeight: '100vh' }}>
      <FamilyFeed variant="family" />
    </div>
  )
}
