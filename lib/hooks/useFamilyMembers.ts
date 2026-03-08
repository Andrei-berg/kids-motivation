'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

  const { familyId, setFamilyId, activeMemberId, setActiveMemberId } = useAppStore()

  useEffect(() => {
    let cancelled = false

    async function fetchMembers() {
      try {
        const supabase = createClient()

        // Step 1: Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Not authenticated — middleware handles redirect
          if (!cancelled) setLoading(false)
          return
        }

        // Step 2: Get the caller's membership row to find their family_id and role
        const { data: membership, error: membershipError } = await supabase
          .from('family_members')
          .select('family_id, id, role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (membershipError) throw membershipError

        if (!membership) {
          // No membership found — user hasn't joined a family yet
          if (!cancelled) setLoading(false)
          return
        }

        // Step 3: Write family_id to store if changed
        if (membership.family_id !== familyId) {
          setFamilyId(membership.family_id)
        }

        // Step 4: Fetch all children in the family
        const { data: children, error: childrenError } = await supabase
          .from('family_members')
          .select('id, display_name, avatar_url, role')
          .eq('family_id', membership.family_id)
          .eq('role', 'child')
          .order('display_name')

        if (childrenError) throw childrenError

        const allChildren: FamilyMember[] = (children ?? []) as FamilyMember[]

        // Step 5: Role-based filtering (REQ-FAM-010)
        // A child user sees only their own entry — not siblings
        const filteredChildren = membership.role === 'child'
          ? allChildren.filter(m => m.id === membership.id)
          : allChildren

        if (!cancelled) {
          setMembers(filteredChildren)

          // Step 6: Auto-select activeMemberId if null or stale
          if (filteredChildren.length > 0) {
            const isActiveMemberValid = activeMemberId !== null &&
              filteredChildren.some(m => m.id === activeMemberId)

            if (!isActiveMemberValid) {
              setActiveMemberId(filteredChildren[0].id)
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load family members')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMembers()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { members, loading, error }
}
