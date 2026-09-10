'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FamilyFeed from '@/components/feed/FamilyFeed'
import { getWalletSettings } from '@/lib/repositories/wallet.repo'

export default function KidFeedPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getWalletSettings()
      .then(s => {
        if (s.feed_enabled === false || s.feed_visible_to_kids === false) {
          router.replace('/kid/day')
        } else {
          setReady(true)
        }
      })
      .catch(() => setReady(true))
  }, [router])

  if (!ready) return null
  return <FamilyFeed variant="kid" />
}
