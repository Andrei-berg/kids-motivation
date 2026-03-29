'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { getChildren } from '@/lib/api'

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

        // ── No Supabase Auth user → fall back to children table ─────────────
        if (!user) {
          const children = await getChildren()
          if (cancelled) return
          const mapped: FamilyMember[] = children.map(c => ({
            id: c.id,
            display_name: c.name,
            avatar_url: null,
            role: 'child' as const,
          }))
          setMembers(mapped)
          // Auto-select first child if none selected or selection is invalid
          const isValid = activeMemberId !== null && mapped.some(m => m.id === activeMemberId)
          if (mapped.length > 0 && !isValid) {
            setActiveMemberId(mapped[0].id)
          }
          setLoading(false)
          return
        }

        // ── Supabase Auth user → use family_members table ───────────────────
        const { data: myMemberships } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)

        const myMembership = myMemberships?.[0]

        if (!myMembership) {
          // Auth user but no family yet — fall back to children table
          const children = await getChildren()
          if (cancelled) return
          const mapped: FamilyMember[] = children.map(c => ({
            id: c.id,
            display_name: c.name,
            avatar_url: null,
            role: 'child' as const,
          }))
          setMembers(mapped)
          const isValid = activeMemberId !== null && mapped.some(m => m.id === activeMemberId)
          if (mapped.length > 0 && !isValid) setActiveMemberId(mapped[0].id)
          setLoading(false)
          return
        }

        const fid = myMembership.family_id

        // Always use legacy children table IDs ('adam'/'alim') — the whole
        // app depends on these TEXT primary keys, not family_members UUIDs.
        const legacyChildren = await getChildren()
        if (cancelled) return

        const mapped: FamilyMember[] = legacyChildren.map(c => ({
          id: c.id,               // 'adam' | 'alim'
          display_name: c.name,
          avatar_url: null,
          role: 'child' as const,
        }))

        if (!cancelled) {
          setMembers(mapped)
          setFamilyId(fid)

          const isValid = activeMemberId !== null && mapped.some(m => m.id === activeMemberId)
          if (mapped.length > 0 && !isValid) {
            setActiveMemberId(mapped[0].id)
          } else if (mapped.length === 0) {
            setActiveMemberId(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load members')
          setLoading(false)
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
