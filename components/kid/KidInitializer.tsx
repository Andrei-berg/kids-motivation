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
    setActiveMemberId(memberId)
  }, [memberId, setActiveMemberId])

  return null
}
