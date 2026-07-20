import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import KidNav from '@/components/kid/KidNav'
import KidInitializer from '@/components/kid/KidInitializer'
import CelebrationOverlay from '@/components/kid/CelebrationOverlay'
import BadgeNudge from '@/components/kid/BadgeNudge'
import ParentPreviewBanner from '@/components/kid/ParentPreviewBanner'
import { paper } from '@/lib/design/tokens'

export default async function KidLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: membership } = await supabase
    .from('family_members')
    .select('id, role, child_id, family_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const cookieStore = await cookies()
  const previewChildId = cookieStore.get('kid_preview')?.value

  // IN-07: only honor the preview cookie when it identifies a child of the
  // parent's own family — a stale/forged value falls through to the normal
  // branch instead of rendering a blank preview.
  let previewValid = false
  if (previewChildId && membership?.role === 'parent' && membership.family_id) {
    const { data: previewChild } = await supabase
      .from('children')
      .select('id')
      .eq('id', previewChildId)
      .eq('family_id', membership.family_id)
      .maybeSingle()
    previewValid = !!previewChild
  }

  if (previewChildId && previewValid) {
    return (
      <div className="min-h-screen" style={{ background: paper.bg, color: paper.ink }}>
        <KidInitializer memberId={previewChildId} />
        <ParentPreviewBanner />
        <KidNav />
        <CelebrationOverlay />
        <BadgeNudge />
        <main className="pb-24 lg:pb-0 lg:pl-16">
          {children}
        </main>
      </div>
    )
  }

  if (!membership || membership.role !== 'child' || !membership.child_id) redirect('/parent/dashboard')

  const resolvedChildId = membership.child_id

  return (
    <div className="min-h-screen" style={{ background: paper.bg, color: paper.ink }}>
      <KidInitializer memberId={resolvedChildId} />
      <KidNav />
      <CelebrationOverlay />
      <BadgeNudge />
      <main className="pb-24 lg:pb-0 lg:pl-16">
        {children}
      </main>
    </div>
  )
}
