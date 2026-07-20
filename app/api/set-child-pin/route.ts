import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// The synthetic account's password is never the PIN — it is a long random secret
// that is never exposed, so the public token endpoint has nothing to brute-force.
// The PIN is verified server-side against a bcrypt hash (set_child_pin_hash /
// verify_child_pin). Sessions are minted via generateLink+verifyOtp in /api/kid/login.
function randomPassword() {
  return randomBytes(24).toString('base64url') + 'Aa1!'
}

export async function POST(req: NextRequest) {
  const { childId, pin } = await req.json()

  if (!childId || !pin || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid input: childId and 4–8 digit pin required' }, { status: 400 })
  }

  const supabase = await createClient()

  // 0. Require an authenticated parent. getUser() re-validates the JWT with the
  //    auth server (getSession() does not), so it is the correct guard here.
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership, error: memberError } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError || !membership) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 })
  }
  if (membership.role !== 'parent') {
    return NextResponse.json({ error: 'Only parents can set a child PIN' }, { status: 403 })
  }

  // 1. Verify the target child belongs to the parent's own family, scoped so a
  //    parent cannot set a PIN for a child in another family regardless of how
  //    permissive the table's RLS policy is.
  //    Note: the PIN is stored as a salted bcrypt hash in child_pin_credentials
  //    (RLS-locked, service-role only) and verified by /api/kid/login. The synthetic
  //    auth account carries only a random unguessable password, so the public token
  //    endpoint cannot be brute-forced.
  const { data: childMember, error: lookupError } = await supabase
    .from('family_members')
    .select('id, user_id')
    .eq('child_id', childId)
    .eq('family_id', membership.family_id)
    .eq('role', 'child')
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 })
  }
  if (!childMember) {
    return NextResponse.json({ error: 'Child not found in your family' }, { status: 404 })
  }

  // 2. PIN login is additive, not exclusive: it never overwrites whatever identity
  //    (real account or a prior synthetic one) is already linked to this child —
  //    /api/kid/login resolves that identity's email at login time, so setting a
  //    PIN just gives an existing account a second way in. A synthetic account is
  //    only ever created here to bootstrap identity for a child with no account
  //    linked yet at all.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key') {
    return NextResponse.json(
      { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set' },
      { status: 500 },
    )
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  let targetUserId = childMember.user_id

  if (!targetUserId) {
    const syntheticEmail = `child_${childId}@internal.familycoins.app`

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: randomPassword(),
      email_confirm: true,
    })

    if (!createError) {
      targetUserId = createData.user?.id ?? null
    } else if (
      createError.message.includes('already been registered') ||
      createError.message.includes('already exists')
    ) {
      // Synthetic user already exists (e.g. a prior PIN was removed without
      // clearing the auth user) — reuse it rather than erroring.
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

      const existingUser = listData?.users?.find((u) => u.email === syntheticEmail)
      if (!existingUser) return NextResponse.json({ error: createError.message }, { status: 500 })

      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, { password: randomPassword() })
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      targetUserId = existingUser.id
    } else {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'Could not resolve the child login account' }, { status: 500 })
  }

  // Store the PIN as a bcrypt hash (server-side, RLS-locked). This — not any auth
  // password — is what /api/kid/login verifies, so the lockout is authoritative.
  const { error: hashError } = await adminClient.rpc('set_child_pin_hash', { p_child_id: childId, p_pin: pin })
  if (hashError) return NextResponse.json({ error: hashError.message }, { status: 500 })

  // 3. Flag the profile as PIN-enabled so the login picker lists it. Only writes
  //    user_id when it was previously unset (the bootstrap case) — an existing
  //    link (real or synthetic) is left exactly as it was.
  const { error: linkError } = await adminClient
    .from('family_members')
    .update({ user_id: targetUserId, pin_set: true })
    .eq('id', childMember.id)
    .eq('family_id', membership.family_id)
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
