import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { childId, pin } = await req.json()

  if (!childId || !pin || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid input: childId and 4–8 digit pin required' }, { status: 400 })
  }

  // 1. Store PIN hash in family_members using the authenticated server client.
  //    Parent's session has UPDATE permission on their family's members (RLS allows it).
  const pinHash = createHash('sha256').update(pin).digest('hex')
  const supabase = await createClient()
  const { error: dbUpdateError } = await supabase
    .from('family_members')
    .update({ child_pin_hash: pinHash })
    .eq('child_id', childId)

  if (dbUpdateError) {
    return NextResponse.json({ error: dbUpdateError.message }, { status: 500 })
  }

  // 2. Create/update the synthetic auth user for PIN-based login.
  //    Requires SUPABASE_SERVICE_ROLE_KEY. If not configured, skip this step —
  //    PIN hash is saved, but kid/login won't work until the key is set.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key') {
    return NextResponse.json({
      ok: true,
      warning: 'PIN hash saved. Set SUPABASE_SERVICE_ROLE_KEY in .env.local to enable kid login.',
    })
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
