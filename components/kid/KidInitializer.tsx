'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * Sets activeMemberId to the logged-in child's own membership ID.
 * Rendered once in KidLayout so all /kid/* pages read the correct child.
 */
export default function KidInitializer({ memberId }: { memberId: string }) {
  const setActiveMemberId = useAppStore((s) => s.setActiveMemberId)

  useEffect(() => {
    // Always override persisted value with server-authoritative memberId
    setActiveMemberId(memberId)
  }, [memberId, setActiveMemberId])

  // Synchronously clear stale memberId before first render
  const current = useAppStore((s) => s.activeMemberId)
  if (current !== memberId) {
    setActiveMemberId(memberId)
  }

  return null
}
