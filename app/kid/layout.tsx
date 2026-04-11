import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KidNav from '@/components/kid/KidNav'
import KidInitializer from '@/components/kid/KidInitializer'
import CelebrationOverlay from '@/components/kid/CelebrationOverlay'

export default async function KidLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: membership } = await supabase
    .from('family_members')
    .select('id, role, child_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.role !== 'child' || !membership.child_id) redirect('/parent/dashboard')

  const resolvedChildId = membership.child_id

  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      <KidInitializer memberId={resolvedChildId} />
      <KidNav />
      <CelebrationOverlay />
      <main className="pb-20 md:pb-0 md:pt-16">
        {children}
      </main>
    </div>
  )
}
