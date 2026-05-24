'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import ChatThread from '@/components/chat/ChatThread'
import { T } from '@/components/kid/design/tokens'
import { useT } from '@/lib/i18n'

type ViewMode = 'mixed' | 'split'
type ChatTab  = 'messages' | 'activity'
const VIEW_MODE_KEY = 'chat_view_mode_v1'

function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'mixed'
  return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'mixed'
}

function ViewModeToggle({ mode, onToggle }: { mode: ViewMode; onToggle: () => void }) {
  return (
    <div style={{ display: 'inline-flex', background: T.lineSoft, borderRadius: 999, padding: 2, border: `1px solid ${T.line}` }}>
      {(['mixed', 'split'] as ViewMode[]).map(m => (
        <button key={m} onClick={() => mode !== m && onToggle()} style={{
          padding: '4px 12px', borderRadius: 999, border: 'none',
          cursor: mode !== m ? 'pointer' : 'default',
          fontFamily: T.fBody, fontSize: 12, fontWeight: 600,
          background: mode === m ? '#fff' : 'transparent',
          color: mode === m ? T.ink2 : T.ink3,
          boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          transition: 'all .15s',
        }}>
          {m === 'mixed' ? 'Лента' : 'Раздельно'}
        </button>
      ))}
    </div>
  )
}

function ChatTabBar({ active, onChange }: { active: ChatTab; onChange: (t: ChatTab) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 14px 10px', borderBottom: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
      {([['messages', '💬 Сообщения', T.coral], ['activity', '✨ Активность', T.plum]] as [ChatTab, string, string][]).map(([tab, label, color]) => (
        <button key={tab} onClick={() => onChange(tab)} style={{
          padding: '6px 16px', borderRadius: 999, cursor: 'pointer',
          fontFamily: T.fBody, fontSize: 13, fontWeight: 600,
          background: active === tab ? color : 'transparent',
          color: active === tab ? '#fff' : T.ink3,
          border: active === tab ? 'none' : `1px solid ${T.line}`,
          boxShadow: active === tab ? `0 3px 10px ${color}44` : 'none',
          transition: 'all .15s',
        }}>{label}</button>
      ))}
    </div>
  )
}

export default function KidChatPage() {
  const t = useT()
  const activeMemberId = useAppStore((s) => s.activeMemberId)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string>('')
  const [memberCount, setMemberCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('mixed')
  const [activeTab, setActiveTab] = useState<ChatTab>('messages')

  useEffect(() => {
    setViewMode(loadViewMode())
  }, [])

  function toggleViewMode() {
    const next: ViewMode = viewMode === 'mixed' ? 'split' : 'mixed'
    setViewMode(next)
    localStorage.setItem(VIEW_MODE_KEY, next)
    if (next === 'mixed') setActiveTab('messages')
  }

  useEffect(() => {
    async function init() {
      if (!activeMemberId) { setLoading(false); return }
      const { data: member } = await supabase
        .from('family_members')
        .select('id, family_id, display_name')
        .eq('child_id', activeMemberId)
        .maybeSingle()
      if (member) {
        setFamilyId(member.family_id)
        setMemberId(member.id)
        setSenderName(member.display_name || '')
        // Count family members for the "online" indicator
        const { count } = await supabase
          .from('family_members')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', member.family_id)
        setMemberCount(count ?? 0)
      }
      setLoading(false)
    }
    init()
  }, [activeMemberId])

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${T.line}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 600, margin: '0 auto' }}>
          {/* Stacked avatars */}
          <div style={{ position: 'relative', width: 50, height: 40, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', left: 0, top: 6,
              width: 28, height: 28, borderRadius: 14,
              background: `${T.pink}CC`, border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.fDisp, fontWeight: 800, color: '#fff', fontSize: 13,
            }}>М</div>
            <div style={{
              position: 'absolute', right: 0, top: 0,
              width: 32, height: 32, borderRadius: 16,
              background: `${T.plum}CC`, border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.fDisp, fontWeight: 800, color: '#fff', fontSize: 14,
              boxShadow: `0 2px 8px ${T.plum}44`,
            }}>П</div>
          </div>

          {/* Title + status */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 900, color: T.ink, lineHeight: 1.1 }}>
              {t('kidChat.title')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: T.teal }}/>
              <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>
                {memberCount > 0 ? `${memberCount} ${t('kidChat.online')}` : t('kidChat.online')}
              </span>
            </div>
          </div>

          {/* View mode toggle */}
          <ViewModeToggle mode={viewMode} onToggle={toggleViewMode} />
        </div>

        {/* Tab bar — shown below header in split mode */}
        {viewMode === 'split' && (
          <ChatTabBar active={activeTab} onChange={setActiveTab} />
        )}
      </div>

      {/* Chat body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `3px solid ${T.coral}`, borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}/>
          </div>
        ) : familyId && memberId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ChatThread
              familyId={familyId}
              currentMemberId={memberId}
              senderName={senderName}
              senderRole="child"
              viewMode={viewMode}
              activeTab={activeTab}
              onToggleViewMode={toggleViewMode}
              onTabChange={setActiveTab}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 40 }}>💬</div>
              <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 800, color: T.ink3, marginTop: 12 }}>
                {t('kidChat.profileNotFound')}
              </div>
              <div style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink3, marginTop: 4 }}>
                {t('kidChat.loginAgain')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
