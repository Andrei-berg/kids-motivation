'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: 'parent' | 'child' | 'extended'
  user_id: string | null
}

export default function FamilyManager() {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadFamily() }, [])

  async function loadFamily() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) return

      const { data: family } = await supabase
        .from('families')
        .select('invite_code')
        .eq('id', membership.family_id)
        .single()

      const { data: allMembers } = await supabase
        .from('family_members')
        .select('id, display_name, avatar_url, role, user_id')
        .eq('family_id', membership.family_id)
        .order('created_at')

      setInviteCode(family?.invite_code ?? null)
      setMembers(allMembers || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roleLabel = (role: string) =>
    role === 'parent' ? 'Родитель' : role === 'child' ? 'Ребёнок' : 'Член семьи'

  const roleColor = (role: string) =>
    role === 'parent' ? '#6366F1' : role === 'child' ? '#10B981' : '#F59E0B'

  if (loading) return <div className="text-gray-400 text-sm">Загрузка...</div>

  return (
    <div>
      {/* Invite code block */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5 mb-6">
        <div className="text-sm font-bold text-indigo-400 uppercase tracking-wide mb-1">
          Код приглашения
        </div>
        <div className="text-gray-300 text-sm mb-4">
          Ребёнок регистрируется на сайте, затем идёт на страницу{' '}
          <span className="font-mono text-indigo-300">/onboarding/join</span> и вводит этот код
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-900 border border-indigo-500/40 rounded-xl px-5 py-3 text-center">
            <div className="font-mono text-3xl font-black tracking-[0.3em] text-white select-all">
              {inviteCode ?? '——'}
            </div>
          </div>
          <button
            onClick={copyCode}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Инструкция для ребёнка: открыть{' '}
          <span className="text-gray-400">{typeof window !== 'undefined' ? window.location.origin : ''}/onboarding/join</span>
          , ввести код выше
        </div>
      </div>

      {/* Members list */}
      <div className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
        Участники ({members.length})
      </div>
      <div className="space-y-2">
        {members.map(m => {
          const isEmoji = m.avatar_url && !m.avatar_url.startsWith('http')
          return (
            <div key={m.id} className="flex items-center gap-3 bg-gray-700/40 rounded-xl px-4 py-3 border border-gray-600/50">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">
                {m.avatar_url
                  ? isEmoji
                    ? m.avatar_url
                    : <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">
                  {m.display_name || 'Без имени'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: roleColor(m.role) }}>
                  {roleLabel(m.role)}
                  {m.role === 'child' && !m.user_id && (
                    <span className="text-gray-500 ml-2">· ожидает присоединения</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
