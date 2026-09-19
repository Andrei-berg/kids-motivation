'use server'

// Persist a child's chosen day-fill interaction style. `children` is not
// child-writable through RLS for this field, so this runs server-side with
// the service-role client behind the same authorization as the wallet
// routes: a child member may only touch their own linked child; any family
// member's target must be in their family (authorizeChildAction,
// app/api/wallet/_lib.ts). Not a money table.

import { createAdminClient, requireFamilyMember, AuthError } from '@/lib/supabase/admin'
import { authorizeChildAction } from '@/app/api/wallet/_lib'

const FILL_STYLES = ['tile-sheet', 'story-stepper', 'sticky-summary'] as const
type FillStyle = typeof FILL_STYLES[number]

export async function updateChildFillStyle(
  childId: string,
  style: FillStyle,
): Promise<{ ok: true }> {
  // All three styles ship as of Phase 9.4 (tile-sheet — plan 02, story-stepper
  // — plan 03), so the Phase-9.3 scope guard that used to reject everything
  // but 'sticky-summary' here is retired. A server action's arguments arrive
  // from the client over the wire, so the FillStyle TypeScript type is not a
  // runtime boundary — reject anything that isn't a string as well as
  // anything outside the whitelist, before any auth or service-role work.
  if (typeof style !== 'string' || !(FILL_STYLES as readonly string[]).includes(style)) {
    throw new AuthError('Bad fill style', 400)
  }

  const member = await requireFamilyMember()
  const admin = createAdminClient()
  await authorizeChildAction(admin, member, childId)

  const { error } = await admin
    .from('children')
    .update({ fill_style: style })
    .eq('id', childId)
  if (error) throw error

  return { ok: true }
}
