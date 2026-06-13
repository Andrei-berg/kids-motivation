import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

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
  //    Note: the PIN itself is NOT stored here. Authentication is handled by
  //    Supabase Auth (synthetic user below), which stores the password with a
  //    salted bcrypt hash. The old unsalted SHA-256 child_pin_hash column was
  //    never read for verification and has been removed as a leak liability.
  const { data: childMember, error: lookupError } = await supabase
    .from('family_members')
    .select('id')
    .eq('child_id', childId)
    .eq('family_id', membership.family_id)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 })
  }
  if (!childMember) {
    return NextResponse.json({ error: 'Child not found in your family' }, { status: 404 })
  }

  // 2. Create/update the synthetic auth user for PIN-based login.
  //    Requires SUPABASE_SERVICE_ROLE_KEY. Without it, PIN login cannot be set up.
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

  const syntheticEmail = `child_${childId}@internal.familycoins.app`

  const { error: createError } = await adminClient.auth.admin.createUser({
    email: syntheticEmail,
    password: pin,
    email_confirm: true,
  })

  if (createError) {
    // User already exists — update their password
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

      const existingUser = listData?.users?.find((u) => u.email === syntheticEmail)
      if (existingUser) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, { password: pin })
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      } else {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
