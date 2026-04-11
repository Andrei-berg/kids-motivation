import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user has a family — if not, send to onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: membership } = await supabase
          .from('family_members')
          .select('id, role')
          .eq('user_id', user.id)
          .maybeSingle()

        let next = '/onboarding'
        if (membership) {
          next = membership.role === 'child' ? '/kid' : '/parent/dashboard'
        }
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth-failed`)
}
