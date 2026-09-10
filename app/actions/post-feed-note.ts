'use server'

// A parent or extended member posts a free-text note into the Family Feed.
// Goes through the server so actor_member_id is the caller's real member row,
// not a client-supplied value. Event kind 'note' is the only kind clients could
// insert directly under RLS; routing it here keeps authorship trustworthy.

import { createAdminClient, requireFamilyMember, AuthError } from '@/lib/supabase/admin'
import { emitFeedEvent } from '@/lib/services/feed.service'

export async function postFeedNote(body: string): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim()
  if (!text) return { ok: false, error: 'Пустое сообщение' }
  if (text.length > 1000) return { ok: false, error: 'Не длиннее 1000 символов' }

  let member
  try {
    member = await requireFamilyMember()
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message }
    throw e
  }
  if (member.role !== 'parent' && member.role !== 'extended') {
    return { ok: false, error: 'Писать в ленту могут только взрослые' }
  }

  const admin = createAdminClient()
  const { data: m } = await admin
    .from('family_members')
    .select('id, display_name')
    .eq('user_id', member.userId)
    .eq('family_id', member.familyId)
    .maybeSingle()

  await emitFeedEvent({
    familyId: member.familyId,
    actorMemberId: m?.id ?? null,
    kind: 'note',
    title: m?.display_name || 'Родитель',
    body: text,
    icon: '✍️',
    refType: 'note',
    refId: null,
  }, admin)

  return { ok: true }
}
