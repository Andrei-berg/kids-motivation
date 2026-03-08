'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export interface FamilyMember {
  id: string
  display_name: string
  avatar_url: string | null
  role: 'parent' | 'child' | 'extended'
}

export function useFamilyMembers(): { members: FamilyMember[]; loading: boolean; error: string | null } {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { activeMemberId, setActiveMemberId } = useAppStore()

  useEffect(() => {
    let cancelled = false

    async function fetchMembers() {
      try {
        const children = await api.getChildren()

        const mapped: FamilyMember[] = children.map(c => ({
          id: c.id,
          display_name: c.name,
          avatar_url: c.emoji ?? null,
          role: 'child' as const,
        }))

        if (!cancelled) {
          setMembers(mapped)

          // Auto-select first if activeMemberId is null or stale
          if (mapped.length > 0) {
            const isValid = activeMemberId !== null && mapped.some(m => m.id === activeMemberId)
            if (!isValid) {
              setActiveMemberId(mapped[0].id)
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load members')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMembers()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { members, loading, error }
}
