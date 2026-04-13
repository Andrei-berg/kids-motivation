import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { childId, pin } = await req.json()

  if (!childId || !pin || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid input: childId and 4–8 digit pin required' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const syntheticEmail = `child_${childId}@internal.familycoins.app`

  // Try to create the auth user first (idempotent: if exists, update password instead).
  const { error: createError } = await adminClient.auth.admin.createUser({
    email: syntheticEmail,
    password: pin,
    email_confirm: true,
  })

  if (createError) {
    // If user already exists, find them via listUsers and update their password.
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 })
      }
      const existingUser = listData?.users?.find((u) => u.email === syntheticEmail)
      if (existingUser) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: pin,
        })
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
  }

  // Store SHA-256 hash of PIN in family_members.child_pin_hash (lookup by child_id)
  const pinHash = createHash('sha256').update(pin).digest('hex')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: dbUpdateError } = await supabase
    .from('family_members')
    .update({ child_pin_hash: pinHash })
    .eq('child_id', childId)

  if (dbUpdateError) {
    return NextResponse.json({ error: dbUpdateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
