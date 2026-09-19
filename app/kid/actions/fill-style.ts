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
  if (!FILL_STYLES.includes(style)) throw new AuthError('Bad fill style', 400)
  // D-01 (Phase 9.3 scope): only 'sticky-summary' is a real, selectable
  // option this phase — reject the other two here too, not just hide them in
  // the UI, so no stray client code can silently switch a child onto an
  // unbuilt style. Remove this guard in Phase 9.4 once tile-sheet/
  // story-stepper actually ship.
  if (style !== 'sticky-summary') throw new AuthError('Fill style not available yet', 400)

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
