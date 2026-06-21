import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import KidNav from '@/components/kid/KidNav'
import KidInitializer from '@/components/kid/KidInitializer'
import CelebrationOverlay from '@/components/kid/CelebrationOverlay'
import BadgeNudge from '@/components/kid/BadgeNudge'
import ParentPreviewBanner from '@/components/kid/ParentPreviewBanner'
import KidChatFAB from '@/components/kid/KidChatFAB'

export default async function KidLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: membership } = await supabase
    .from('family_members')
    .select('id, role, child_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const cookieStore = await cookies()
  const previewChildId = cookieStore.get('kid_preview')?.value

  if (previewChildId && membership?.role === 'parent') {
    return (
      <div className="min-h-screen" style={{ background: '#FFFBF5', color: '#1A1423' }}>
        <KidInitializer memberId={previewChildId} />
        <ParentPreviewBanner />
        <KidNav />
        <CelebrationOverlay />
        <BadgeNudge />
        <KidChatFAB />
        <main className="pb-24 lg:pb-0 lg:pl-16">
          {children}
        </main>
      </div>
    )
  }

  if (!membership || membership.role !== 'child' || !membership.child_id) redirect('/parent/dashboard')

  const resolvedChildId = membership.child_id

  return (
    <div className="min-h-screen" style={{ background: '#FFFBF5', color: '#1A1423' }}>
      <KidInitializer memberId={resolvedChildId} />
      <KidNav />
      <CelebrationOverlay />
      <BadgeNudge />
      <KidChatFAB />
      <main className="pb-24 lg:pb-0 lg:pl-16">
        {children}
      </main>
    </div>
  )
}
