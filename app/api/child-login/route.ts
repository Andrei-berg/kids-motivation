// app/api/child-login/route.ts
// Parent-only management of a child's login identity.
//
//   GET  ?childId=…  → the child's current login state (linked email, whether
//                      it is a real Google/email account or a synthetic PIN-only
//                      one, whether a PIN is set).
//   POST { childId }  → "reset login": unlink the real account and repoint the
//                      child at a per-child synthetic account, clearing
//                      has_real_account. Used when a child loses access to the
//                      email they signed in with — all their data stays put
//                      (it is keyed on family_members / child_id, never on the
//                      auth user), the family-code + PIN login keeps working,
//                      and the profile reappears in the /onboarding/join claim
//                      picker so a fresh account can be linked later.
//
// The old auth user is intentionally left orphaned rather than deleted: deleting
// an auth user is destructive and irreversible, and an unreferenced synthetic/
// real user sitting in auth.users is harmless.
//
// All money-model rules are unaffected — this touches only auth identity columns
// on family_members via the service-role client, behind requireParent().

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient, requireParent, AuthError } from '@/lib/supabase/admin'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'

type Admin = ReturnType<typeof createAdminClient>

function randomPassword() {
  return randomBytes(24).toString('base64url') + 'Aa1!'
}

function syntheticEmailFor(childId: string) {
  return `child_${childId}@internal.familycoins.app`
}

function isSyntheticEmail(email: string | null | undefined) {
  return !!email && /^child_.+@internal\.familycoins\.app$/.test(email)
}

/** Look up the child's family_members row, scoped to the parent's own family. */
async function loadChildMember(admin: Admin, childId: string, familyId: string) {
  const { data, error } = await admin
    .from('family_members')
    .select('id, user_id, has_real_account, pin_set')
    .eq('child_id', childId)
    .eq('family_id', familyId)
    .eq('role', 'child')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new AuthError('Child not found in your family', 404)
  return data
}

/**
 * Ensure the per-child synthetic auth account exists and return its id, rotating
 * its (never-exposed, random) password. Mirrors the bootstrap logic in
 * /api/set-child-pin.
 */
async function ensureSyntheticAccount(admin: Admin, childId: string): Promise<string> {
  const email = syntheticEmailFor(childId)

  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
  })
  if (!createError) {
    const id = createData.user?.id
    if (!id) throw new Error('Could not create the child login account')
    return id
  }

  const alreadyExists =
    createError.message.includes('already been registered') ||
    createError.message.includes('already exists')
  if (!alreadyExists) throw new Error(createError.message)

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error(listError.message)
  const existing = listData?.users?.find((u) => u.email === email)
  if (!existing) throw new Error(createError.message)

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password: randomPassword() })
  if (updateError) throw new Error(updateError.message)
  return existing.id
}

export async function GET(req: NextRequest) {
  try {
    const childId = req.nextUrl.searchParams.get('childId')
    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 })
    }

    const member = await requireParent()
    const admin = createAdminClient()
    const childMember = await loadChildMember(admin, childId, member.familyId)

    let email: string | null = null
    if (childMember.user_id) {
      const { data } = await admin.auth.admin.getUserById(childMember.user_id)
      email = data?.user?.email ?? null
    }

    const synthetic = !childMember.user_id || isSyntheticEmail(email) || !childMember.has_real_account

    return NextResponse.json({
      linked: !!childMember.user_id,
      hasRealAccount: !!childMember.has_real_account,
      pinSet: !!childMember.pin_set,
      isSynthetic: synthetic,
      // Only surface a real address; never leak the internal synthetic email.
      email: synthetic ? null : email,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { childId } = await req.json()
    if (!childId || typeof childId !== 'string') {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 })
    }

    const member = await requireParent()
    const admin = createAdminClient()
    const childMember = await loadChildMember(admin, childId, member.familyId)

    // Nothing to reset — the child is already on a synthetic / PIN-only identity.
    if (!childMember.has_real_account) {
      return NextResponse.json({ ok: true, alreadyReset: true })
    }

    const previousUserId = childMember.user_id
    const syntheticId = await ensureSyntheticAccount(admin, childId)

    // Repoint the child at the synthetic account and clear the real-account flag.
    // pin_set and child_pin_credentials are left untouched, so family-code + PIN
    // login (which resolves the email from user_id at login time) keeps working.
    const { error: updateError } = await admin
      .from('family_members')
      .update({ user_id: syntheticId, has_real_account: false })
      .eq('id', childMember.id)
      .eq('family_id', member.familyId)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    void insertAuditEvent(
      {
        family_id: member.familyId,
        child_id: childId,
        action_type: 'settings_change',
        description: 'Child login reset — real account unlinked, reverted to PIN-only identity',
        coins_delta: null,
        actor_user_id: member.userId,
        metadata: { kind: 'child_login_reset', previous_user_id: previousUserId, synthetic_user_id: syntheticId },
      },
      admin,
    )

    return NextResponse.json({ ok: true, pinSet: !!childMember.pin_set })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
