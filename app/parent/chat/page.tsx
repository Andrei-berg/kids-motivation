'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ParentNav from '@/components/parent/ParentNav'
import ChatThread from '@/components/chat/ChatThread'

export default function ParentChatPage() {
  const router = useRouter()
  const [memberId, setMemberId] = useState<string | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string>('Родитель')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      const { data: member } = await supabase
        .from('family_members')
        .select('id, role, display_name, family_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (member && member.role === 'parent') {
        setMemberId(member.id)
        setFamilyId(member.family_id)
        setSenderName(member.display_name || 'Родитель')
      }

      setLoading(false)
    }

    init()
  }, [router])

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      <ParentNav />

      {/* Main content area */}
      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-0 pb-16 md:pb-0 md:px-4 md:pt-4">
        <h1 className="text-gray-100 text-xl font-bold px-4 py-3">Семейный чат</h1>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : familyId && memberId ? (
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-gray-900 mx-4 mb-4">
            <ChatThread
              familyId={familyId}
              currentMemberId={memberId}
              senderName={senderName}
              senderRole="parent"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-4">
            Профиль родителя не найден. Убедитесь, что вы зарегистрированы как родитель.
          </div>
        )}
      </div>
    </div>
  )
}
