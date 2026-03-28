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

  const { activeMemberId, setActiveMemberId, setFamilyId } = useAppStore()

  useEffect(() => {
    let cancelled = false

    async function fetchMembers() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) { setMembers([]); setLoading(false) }
          return
        }

        // Find the user's family membership
        const { data: myMembership } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!myMembership) {
          if (!cancelled) { setMembers([]); setLoading(false) }
          return
        }

        const fid = myMembership.family_id

        // Load all members of the family
        const { data: allMembers, error: membersError } = await supabase
          .from('family_members')
          .select('id, display_name, avatar_url, role')
          .eq('family_id', fid)
          .order('created_at')

        if (membersError) throw membersError

        const mapped: FamilyMember[] = (allMembers || []).map(m => ({
          id: m.id,
          display_name: m.display_name || 'Участник',
          avatar_url: m.avatar_url,
          role: m.role as 'parent' | 'child' | 'extended',
        }))

        if (!cancelled) {
          setMembers(mapped)
          setFamilyId(fid)

          const children = mapped.filter(m => m.role === 'child')
          const isValid = activeMemberId !== null && children.some(m => m.id === activeMemberId)
          if (children.length > 0 && !isValid) {
            setActiveMemberId(children[0].id)
          } else if (children.length === 0 && activeMemberId !== null) {
            setActiveMemberId(null)
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
