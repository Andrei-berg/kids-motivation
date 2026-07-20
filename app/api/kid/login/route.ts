// app/api/kid/login/route.ts
// Server-side child PIN login. The synthetic child account has no usable password
// (see /api/set-child-pin), so login cannot happen at the public token endpoint —
// it must go through here. We verify the PIN against a bcrypt hash with an
// authoritative per-child lockout (verify_child_pin), then mint a session with
// generateLink + verifyOtp and let the cookie-bound server client set auth cookies.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { familyId, childId, pin } = await req.json()

  if (!familyId || !childId || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'familyId, childId and a 4–8 digit pin required' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key' || !supabaseUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const admin = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // Confirm the child is a PIN-enabled member of the named family (prevents probing
  // arbitrary childIds and ties the attempt to a family the caller actually named).
  const { data: member } = await admin
    .from('family_members')
    .select('id, user_id')
    .eq('child_id', childId)
    .eq('family_id', familyId)
    .eq('role', 'child')
    .eq('pin_set', true)
    .maybeSingle()
  if (!member || !member.user_id) {
    return NextResponse.json({ error: 'wrong_pin' }, { status: 401 })
  }

  // Verify PIN + lockout (authoritative — we are the only verifier).
  const { data: verify, error: verifyErr } = await admin.rpc('verify_child_pin', { p_child_id: childId, p_pin: pin })
  if (verifyErr) return NextResponse.json({ error: verifyErr.message }, { status: 500 })
  const result = Array.isArray(verify) ? verify[0] : verify
  const status = result?.status as string | undefined

  if (status === 'locked') {
    const until = result?.locked_until ? new Date(result.locked_until) : null
    const retryAfter = until ? Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000)) : 900
    return NextResponse.json({ error: 'locked', retryAfter }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
  }
  if (status !== 'ok') {
    // 'bad_pin' or 'no_pin' — do not distinguish, to avoid leaking which is which.
    return NextResponse.json({ error: 'wrong_pin' }, { status: 401 })
  }

  // PIN correct → mint a session for whichever identity is currently linked to
  // this child (a real Google/email account if they have one, otherwise the
  // synthetic PIN-only account) — resolved dynamically rather than assuming a
  // fixed synthetic email, so PIN login keeps working even after the child
  // claims a real account.
  const { data: loginUser, error: loginUserErr } = await admin.auth.admin.getUserById(member.user_id)
  if (loginUserErr || !loginUser?.user?.email) {
    return NextResponse.json({ error: 'Could not resolve the child login account' }, { status: 500 })
  }
  const loginEmail = loginUser.user.email

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: loginEmail })
  if (linkErr || !link?.properties?.email_otp) {
    return NextResponse.json({ error: 'Could not start the session' }, { status: 500 })
  }

  // verifyOtp on the cookie-bound server client sets the auth cookies on the response.
  const supabase = await createClient()
  const { error: otpErr } = await supabase.auth.verifyOtp({
    email: loginEmail,
    token: link.properties.email_otp,
    type: 'email',
  })
  if (otpErr) return NextResponse.json({ error: 'Could not complete the session' }, { status: 500 })

  return NextResponse.json({ ok: true, childId })
}
