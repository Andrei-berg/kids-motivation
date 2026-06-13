// lib/supabase/admin.ts
// Server-only helpers for privileged wallet/money mutations.
//
// Two pieces:
//   1. createAdminClient() — a service-role Supabase client that BYPASSES RLS.
//      Use it ONLY inside route handlers / server actions, after the caller's
//      identity and authorization have been verified with the guards below.
//   2. requireParent() / requireFamilyMember() — read the caller's cookie
//      session (anon key, RLS-bound) and assert role/family before any write.
//
// NEVER import this file in a 'use client' component.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from './server'

/**
 * Service-role Supabase client. Bypasses RLS — all writes must be gated by an
 * explicit authorization check (requireParent / requireFamilyMember) first.
 * Throws if the service key is not configured.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL is not configured')

  return createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type Membership = {
  userId: string
  familyId: string
  role: 'parent' | 'child' | 'extended'
  /** For child members: the children.id they are linked to. null for parents. */
  childId: string | null
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Resolve the caller's family membership from their cookie session.
 * getUser() re-validates the JWT with the auth server (getSession() does not).
 * Throws AuthError(401) if unauthenticated, AuthError(404) if no membership.
 */
export async function requireFamilyMember(): Promise<Membership> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new AuthError('Unauthorized', 401)
  }

  const { data: membership, error: memberError } = await supabase
    .from('family_members')
    .select('family_id, role, child_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError || !membership) {
    throw new AuthError('Family not found', 404)
  }

  return {
    userId: user.id,
    familyId: membership.family_id,
    role: membership.role,
    childId: membership.child_id ?? null,
  }
}

/**
 * Like requireFamilyMember but additionally asserts the caller is a parent.
 * Throws AuthError(403) for non-parents.
 */
export async function requireParent(): Promise<Membership> {
  const membership = await requireFamilyMember()
  if (membership.role !== 'parent') {
    throw new AuthError('Parent role required', 403)
  }
  return membership
}

/**
 * Assert that a child belongs to the caller's family. Uses the service client
 * so it works regardless of RLS. Throws AuthError(403) if the child is not in
 * the family. Returns the child's family_id for convenience.
 */
export async function assertChildInFamily(
  admin: ReturnType<typeof createAdminClient>,
  childId: string,
  familyId: string,
): Promise<void> {
  const { data, error } = await admin
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('family_id', familyId)
    .maybeSingle()
  if (error || !data) {
    throw new AuthError('Child not found in your family', 403)
  }
}
