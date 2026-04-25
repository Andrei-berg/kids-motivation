'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import ChatThread from '@/components/chat/ChatThread'
import { T } from '@/components/kid/design/tokens'

export default function KidChatPage() {
  const activeMemberId = useAppStore((s) => s.activeMemberId)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string>('Ребёнок')
  const [loading, setLoading] = useState(true)

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
        setSenderName(member.display_name || 'Ребёнок')
      }
      setLoading(false)
    }
    init()
  }, [activeMemberId])

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${T.line}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: 0, top: 4, width: 28, height: 28, borderRadius: 14, background: '#FF8FB1', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fDisp, fontWeight: 800, color: '#fff', fontSize: 13 }}>М</div>
            <div style={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, borderRadius: 14, background: '#6C5CE7', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fDisp, fontWeight: 800, color: '#fff', fontSize: 13 }}>П</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fDisp, fontSize: 18, fontWeight: 900, color: T.ink }}>Семейный чат</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: 999, background: T.teal }}/>
              <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>Онлайн</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 600, width: '100%', margin: '0 auto', padding: '0 0' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.coral}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
          </div>
        ) : familyId && memberId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ChatThread
              familyId={familyId}
              currentMemberId={memberId}
              senderName={senderName}
              senderRole="child"
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 40 }}>💬</div>
              <div style={{ fontFamily: T.fDisp, fontSize: 16, fontWeight: 800, color: T.ink3, marginTop: 12 }}>Профиль не найден</div>
              <div style={{ fontFamily: T.fBody, fontSize: 13, color: T.ink3, marginTop: 4 }}>Попробуй войти заново</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
