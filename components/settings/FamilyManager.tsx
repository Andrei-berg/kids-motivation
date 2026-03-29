'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: 'parent' | 'child' | 'extended'
  user_id: string | null
}

const EMOJI_OPTIONS = ['👦', '👧', '🧒', '👶', '🦸', '🧠', '⭐', '🏆']

export default function FamilyManager() {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Add child form
  const [showAddChild, setShowAddChild] = useState(false)
  const [childName, setChildName] = useState('')
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 8)
  const [selectedEmoji, setSelectedEmoji] = useState('👦')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [addingChild, setAddingChild] = useState(false)
  const [addChildError, setAddChildError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 19 }, (_, i) => currentYear - i)

  useEffect(() => { loadFamily() }, [])

  async function loadFamily() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)

      const membership = memberships?.[0]
      if (!membership) return

      setFamilyId(membership.family_id)

      const [{ data: family }, { data: allMembers }] = await Promise.all([
        supabase.from('families').select('invite_code').eq('id', membership.family_id).single(),
        supabase.from('family_members').select('id, display_name, avatar_url, role, user_id').eq('family_id', membership.family_id).order('joined_at'),
      ])

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
  }

  function resetAddChildForm() {
    setShowAddChild(false)
    setChildName('')
    setBirthYear(new Date().getFullYear() - 8)
    setSelectedEmoji('👦')
    setPhotoFile(null)
    setPhotoPreviewUrl(null)
    setAddChildError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAddChild() {
    if (!childName.trim()) { setAddChildError('Введите имя ребёнка'); return }
    if (!familyId || !userId) { setAddChildError('Семья не найдена — перезагрузите страницу'); return }

    setAddingChild(true)
    setAddChildError('')

    try {
      const supabase = createClient()
      let avatarUrl: string | undefined

      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `children/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true })
        if (uploadError) throw new Error(uploadError.message)
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      } else {
        avatarUrl = selectedEmoji
      }

      const { data: newMember, error } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: null,
          role: 'child',
          display_name: childName.trim(),
          birth_year: birthYear,
          avatar_url: avatarUrl ?? null,
        })
        .select('id, display_name, avatar_url, role, user_id')
        .single()

      if (error) throw new Error(error.message)

      setMembers(prev => [...prev, newMember])
      resetAddChildForm()
    } catch (err) {
      setAddChildError(err instanceof Error ? err.message : 'Ошибка при добавлении ребёнка')
    } finally {
      setAddingChild(false)
    }
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
              copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Инструкция для ребёнка: открыть{' '}
          <span className="text-gray-400">
            {typeof window !== 'undefined' ? window.location.origin : ''}/onboarding/join
          </span>
          , ввести код выше
        </div>
      </div>

      {/* Members list */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">
          Участники ({members.length})
        </div>
        <button
          onClick={() => setShowAddChild(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <span>+</span> Добавить ребёнка
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {members.map(m => {
          const isEmoji = m.avatar_url && !m.avatar_url.startsWith('http')
          return (
            <div key={m.id} className="flex items-center gap-3 bg-gray-700/40 rounded-xl px-4 py-3 border border-gray-600/50">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">
                {m.avatar_url
                  ? isEmoji
                    ? m.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
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

      {/* Add child form */}
      {showAddChild && (
        <div className="bg-gray-700/40 border border-emerald-500/30 rounded-2xl p-5">
          <div className="font-bold text-white mb-4">Новый ребёнок</div>

          <div className="mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Имя</label>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-emerald-500"
              placeholder="Имя ребёнка"
              value={childName}
              onChange={e => setChildName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Год рождения</label>
            <select
              value={birthYear}
              onChange={e => setBirthYear(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg text-white text-sm px-3 py-2.5 outline-none focus:border-emerald-500"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Аватар</label>
            {photoPreviewUrl ? (
              <div className="flex items-center gap-3 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreviewUrl} alt="Превью" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500" />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  Удалить фото
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1.5 mb-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`text-xl p-1.5 rounded-lg border-2 transition-all ${
                      selectedEmoji === emoji
                        ? 'border-emerald-500 bg-emerald-500/15'
                        : 'border-gray-600 bg-gray-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs text-gray-400 border border-gray-600 rounded-lg py-2 hover:border-gray-400 transition-colors"
            >
              Загрузить фото
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          </div>

          {addChildError && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm mb-3">
              ⚠️ {addChildError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddChild}
              disabled={addingChild}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {addingChild ? 'Добавление...' : 'Добавить'}
            </button>
            <button
              onClick={resetAddChildForm}
              className="px-4 py-2.5 bg-gray-700 text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
