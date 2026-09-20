'use server'

// Persist a child's chosen weekly-boost detail-view style. `children` is not
// child-writable through RLS for this field, so this runs server-side with
// the service-role client behind the same authorization as the wallet
// routes: a child member may only touch their own linked child; any family
// member's target must be in their family (authorizeChildAction,
// app/api/wallet/_lib.ts). Not a money table.

import { createAdminClient, requireFamilyMember, AuthError } from '@/lib/supabase/admin'
import { authorizeChildAction } from '@/app/api/wallet/_lib'

const BOOST_STYLES = ['segmented-bar', 'quest-checklist', 'ring-badges'] as const
type BoostStyle = typeof BOOST_STYLES[number]

export async function updateChildBoostStyle(
  childId: string,
  style: BoostStyle,
): Promise<{ ok: true }> {
  // A server action's arguments arrive from the client over the wire, so the
  // BoostStyle TypeScript type is compile-time only and is not a runtime
  // boundary — reject anything that isn't a string as well as anything
  // outside the whitelist, before any auth or service-role work. All three
  // literals are validated (not just 'segmented-bar'): unlike Phase 9.3's
  // fill_style scope guard, there is no product reason to reject a value the
  // DB CHECK already accepts, and Phase 9.6 must not need to edit this action.
  if (typeof style !== 'string' || !(BOOST_STYLES as readonly string[]).includes(style)) {
    throw new AuthError('Bad boost style', 400)
  }

  const member = await requireFamilyMember()
  const admin = createAdminClient()
  await authorizeChildAction(admin, member, childId)

  const { error } = await admin
    .from('children')
    .update({ boost_style: style })
    .eq('id', childId)
  if (error) throw error

  return { ok: true }
}
