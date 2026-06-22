import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

function isMobileUA(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? ''
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public reachability probe (lib/use-connectivity.ts) — must return its 200 JSON
  // straight from the network, not get caught by the auth-redirect logic below.
  if (pathname === '/api/health') return NextResponse.next()

  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Classify the path
  const isPublicPath =
    pathname.startsWith('/auth') ||
    pathname === '/'
  const isOnboardingPath = pathname.startsWith('/onboarding')
  const isParentPath = pathname.startsWith('/parent')
  const isKidPath = pathname.startsWith('/kid')
  // isFamilyPath → pathname.startsWith('/family') — allowed for all authenticated members, no guard needed

  // Preview mode: an authenticated parent may inspect /kid/* with ?preview=true.
  // It is NOT a bypass for unauthenticated visitors — the !user check below still
  // redirects anyone without a session away from /kid/*.
  const isPreviewMode = request.nextUrl.searchParams.get('preview') === 'true'

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
        url.pathname = isMobileUA(request) ? '/parent-center' : '/parent/dashboard'
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

    // Parent on mobile accessing desktop view → redirect to mobile view
    if (membership?.role === 'parent' && pathname === '/parent/dashboard' && isMobileUA(request)) {
      const url = request.nextUrl.clone()
      url.pathname = '/parent-center'
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

      // /kid/* — child role only, UNLESS preview mode (REQ-ROLE-003, REQ-PARENT-008)
      if (isKidPath && membership.role !== 'child' && !isPreviewMode) {
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
