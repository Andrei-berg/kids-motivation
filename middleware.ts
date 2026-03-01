import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Public paths — no auth required
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth') ||
    pathname === '/'

  // Onboarding paths — auth required but family-check exempt
  const isOnboardingPath = pathname.startsWith('/onboarding')

  // Not logged in + trying to access protected route → /login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in but on a data route — check family membership
  if (user && !isPublicPath && !isOnboardingPath) {
    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      // Authenticated but no family — go to onboarding
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/welcome'
      return NextResponse.redirect(url)
    }
  }

  // All checks passed — return the supabase response (preserves refreshed cookies)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Files with extensions (svg, png, jpg, jpeg, gif, webp, ico, css, js)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
