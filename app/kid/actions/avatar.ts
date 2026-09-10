'use server'

// Persist a child's chosen avatar. `children` is not child-writable through RLS,
// so this runs server-side with the service-role client behind the same
// authorization as the wallet routes: a child member may only touch their own
// linked child; any family member's target must be in their family
// (authorizeChildAction, app/api/wallet/_lib.ts). Not a money table.

import { createAdminClient, requireFamilyMember, AuthError } from '@/lib/supabase/admin'
import { authorizeChildAction } from '@/app/api/wallet/_lib'

const HAIR_SHAPES = ['short', 'buzz', 'curly', 'long', 'bun', 'mohawk']
const ACCESSORIES = ['none', 'glasses', 'cap', 'headphones', 'bow']
const HEX = /^#[0-9a-fA-F]{6}$/

function sanitizeConfig(kind: 'emoji' | 'character', raw: unknown): Record<string, unknown> {
  const c = (raw ?? {}) as Record<string, unknown>
  if (kind === 'emoji') {
    const emoji = typeof c.emoji === 'string' ? c.emoji.slice(0, 8) : '🙂'
    const bg = typeof c.bg === 'string' && HEX.test(c.bg) ? c.bg : undefined
    return bg ? { emoji, bg } : { emoji }
  }
  const pick = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v : fallback)
  return {
    skin: pick(c.skin, '#F5C9A1'),
    hair: HAIR_SHAPES.includes(String(c.hair)) ? String(c.hair) : 'short',
    hairColor: pick(c.hairColor, '#2B1810'),
    shirt: pick(c.shirt, '#2F7FE4'),
    accessory: ACCESSORIES.includes(String(c.accessory)) ? String(c.accessory) : 'none',
  }
}

export async function updateChildAvatar(
  childId: string,
  kind: 'emoji' | 'character',
  config: unknown,
): Promise<{ ok: true }> {
  if (kind !== 'emoji' && kind !== 'character') throw new AuthError('Bad avatar kind', 400)

  const member = await requireFamilyMember()
  const admin = createAdminClient()
  await authorizeChildAction(admin, member, childId)

  const { error } = await admin
    .from('children')
    .update({ avatar_kind: kind, avatar_config: sanitizeConfig(kind, config) })
    .eq('id', childId)
  if (error) throw error

  return { ok: true }
}
