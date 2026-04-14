'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import KidNav from '@/components/kid/KidNav'
import ChatThread from '@/components/chat/ChatThread'

export default function KidChatPage() {
  const activeMemberId = useAppStore((s) => s.activeMemberId)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string>('Ребёнок')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      if (!activeMemberId) {
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('family_members')
        .select('family_id, display_name')
        .eq('id', activeMemberId)
        .maybeSingle()

      if (member) {
        setFamilyId(member.family_id)
        setSenderName(member.display_name || 'Ребёнок')
      }

      setLoading(false)
    }

    init()
  }, [activeMemberId])

  return (
    <div className="bg-amber-50 min-h-screen flex flex-col pb-20">
      <KidNav />

      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-0">
        <h1 className="text-gray-800 text-xl font-bold px-4 py-3">Семейный чат</h1>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : familyId && activeMemberId ? (
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-white mx-4 mb-4 shadow-sm border border-amber-100">
            <ChatThread
              familyId={familyId}
              currentMemberId={activeMemberId}
              senderName={senderName}
              senderRole="child"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-4">
            Профиль не найден. Попробуйте войти заново.
          </div>
        )}
      </div>
    </div>
  )
}
