import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Classify the path
  const isPublicPath =
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.startsWith('/parent') // TODO: remove when parent auth is wired up
  const isOnboardingPath = pathname.startsWith('/onboarding')
  const isParentPath = pathname.startsWith('/parent')
  const isKidPath = pathname.startsWith('/kid')
  // isFamilyPath → pathname.startsWith('/family') — allowed for all authenticated members, no guard needed

  // Not logged in + trying to access protected route → /
  if (!user && !isPublicPath && !isOnboardingPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // For authenticated users: fetch role once (covers root redirect + route guards)
  if (user) {
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    // Role-based post-login redirect at root / (REQ-ROLE-001)
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      if (!membership) {
        url.pathname = '/onboarding'
      } else if (membership.role === 'parent') {
        url.pathname = '/parent/dashboard'
      } else if (membership.role === 'child') {
        url.pathname = '/kid/day'
      } else {
        // extended or unknown role — safe fallback
        url.pathname = '/dashboard'
      }
      return NextResponse.redirect(url)
    }

    // No family yet + not on public/onboarding → /onboarding (skip query errors)
    if (!membershipError && !membership && !isPublicPath && !isOnboardingPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Route guards (only when membership exists)
    if (membership) {
      // /parent/* — parent role only (REQ-ROLE-002)
      if (isParentPath && membership.role !== 'parent') {
        const url = request.nextUrl.clone()
        url.pathname = '/kid/day'
        return NextResponse.redirect(url)
      }

      // /kid/* — child role only (REQ-ROLE-003)
      if (isKidPath && membership.role !== 'child') {
        const url = request.nextUrl.clone()
        url.pathname = '/parent/dashboard'
        return NextResponse.redirect(url)
      }

      // /family/* — allowed for all authenticated members (REQ-ROLE-004): no redirect
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
