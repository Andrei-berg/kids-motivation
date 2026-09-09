import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // An in-progress "join family by invite code" flow, forwarded through the
  // OAuth round-trip via redirectTo — see app/page.tsx's handleGoogle and
  // app/onboarding/join/page.tsx's unauthenticated-join redirect.
  const inviteCode = searchParams.get('next') === 'join' ? searchParams.get('code_invite') : null

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

        // An explicit invite code means the user was handed a join link on
        // purpose (e.g. a child recovering their profile on a new account) —
        // honour it even if this account already has a membership row somewhere,
        // instead of bouncing to a dashboard where the claim picker is
        // unreachable. Mirrors the same rule in app/onboarding/join/page.tsx.
        let next: string
        if (inviteCode) {
          next = `/onboarding/join?code=${encodeURIComponent(inviteCode)}`
        } else if (membership) {
          next = membership.role === 'child' ? '/kid' : '/parent/dashboard'
        } else {
          next = '/onboarding'
        }
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth-failed`)
}
