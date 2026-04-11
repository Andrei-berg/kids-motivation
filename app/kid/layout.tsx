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
    .select('id, role, family_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.role !== 'child') redirect('/parent/dashboard')

  // Resolve the actual children.id (text, e.g. 'adam') for this member
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('family_id', membership.family_id)
    .ilike('name', membership.display_name)
    .maybeSingle()

  // Fall back to member UUID only if child lookup fails (should not happen in practice)
  const resolvedChildId = child?.id ?? membership.id

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
