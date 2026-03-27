import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Public paths — no auth required
  const isPublicPath =
    pathname.startsWith('/auth') ||
    pathname === '/'

  // Onboarding paths — auth required but family-check exempt
  const isOnboardingPath = pathname.startsWith('/onboarding')

  // Not logged in + trying to access protected route → /
  if (!user && !isPublicPath && !isOnboardingPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Logged in + on root page → /dashboard
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Logged in but no family → onboarding (skip if already going there)
  if (user && !isPublicPath && !isOnboardingPath) {
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Only redirect if we got a clean null (no family) — not on query errors
    if (!membershipError && !membership) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
