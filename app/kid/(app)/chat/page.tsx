'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import ChatThread from '@/components/chat/ChatThread'
import ScreenHeader from '@/components/kid/design/ScreenHeader'
import { markChatRead, subscribeToMessages } from '@/lib/repositories/chat.repo'
import { getWallet } from '@/lib/repositories/wallet.repo'
import { base, paper } from '@/lib/design/tokens'
import { useT } from '@/lib/i18n'

export default function KidChatPage() {
  const t = useT()
  const activeMemberId = useAppStore((s) => s.activeMemberId)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string>('')
  const [coins, setCoins] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      if (!activeMemberId) { setLoading(false); return }
      const [{ data: member }, wallet] = await Promise.all([
        supabase
          .from('family_members')
          .select('id, family_id, display_name')
          .eq('child_id', activeMemberId)
          .maybeSingle(),
        getWallet(activeMemberId).catch(() => null),
      ])
      if (member) {
        setFamilyId(member.family_id)
        setMemberId(member.id)
        setSenderName(member.display_name || '')
      }
      setCoins(wallet?.coins ?? 0)
      setLoading(false)
    }
    init()
  }, [activeMemberId])

  // D-04: mark the thread read when the kid opens chat, and again when new
  // messages arrive while the screen is visible — clears the nav unread badge.
  useEffect(() => {
    if (!familyId || !memberId) return
    markChatRead(memberId)
    const unsubscribe = subscribeToMessages(familyId, () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        markChatRead(memberId)
      }
    })
    return () => { unsubscribe() }
  }, [familyId, memberId])

  return (
    <div style={{ minHeight: '100vh', background: paper.bg, display: 'flex', flexDirection: 'column', paddingBottom: 90 }}>
      {/* Header (D-13 shared "сберкнижка" header) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${paper.line}`, background: paper.bg }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <ScreenHeader title={t('kidHeader.chat')} coins={coins} name={senderName}/>
        </div>
      </div>

      {/* Chat body — view-mode toggle/tab bar are rendered by ChatThread itself */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `3px solid ${paper.accent}`, borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}/>
          </div>
        ) : familyId && memberId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ChatThread
              theme="paper"
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
              <div style={{ fontFamily: base.fontDisplay, fontSize: 16, fontWeight: 700, color: paper.ink2, marginTop: 12 }}>
                {t('kidChat.profileNotFound')}
              </div>
              <div style={{ fontFamily: base.fontBody, fontSize: 13, color: paper.ink3, marginTop: 4 }}>
                {t('kidChat.loginAgain')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
