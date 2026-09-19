'use server'
// A child recognizes a sibling with a medal — always coins=0 (D-08), always
// server-side with the service-role client behind an app-level guard. This
// mirrors app/actions/send-medal.ts's shape (guard → admin client → cap
// check → insert → feed emit → push → { success, error? }), but the guard is
// the INVERTED twin of authorizeChildAction (app/api/wallet/_lib.ts), which
// permits a child only on their OWN childId — this action instead requires
// role === 'child' targeting a DIFFERENT child in the same family.

import { createAdminClient, requireFamilyMember, assertChildInFamily, AuthError } from '@/lib/supabase/admin'
import { emitFeedEvent } from '@/lib/services/feed.service'
import { notifyChild } from '@/app/actions/push-notifications'
import { isKnownMedalPhrase } from '@/lib/kid/medal-phrases'
import { localDateString } from '@/utils/helpers'

export interface SendKidMedalParams {
  targetChildId: string // children.id of the sibling receiving the medal
  phrase: string // must be one of MEDAL_PHRASES — validated server-side (D-11)
}

export interface SendKidMedalResult {
  success: boolean
  error?: string
}

/**
 * Sibling-target guard, module-local and NOT exported: in a 'use server'
 * file every exported function becomes a callable endpoint, so publishing
 * this guard would open a second server endpoint. Asserts the caller is a
 * child, has a linked child profile, is not targeting themselves, and that
 * the target belongs to the caller's own family. The client-supplied
 * familyId is NEVER trusted — the family always comes from the caller's own
 * session membership (same rule as sendMedal's "the client-supplied
 * familyId is NOT trusted" comment).
 */
async function assertSiblingTarget(
  admin: ReturnType<typeof createAdminClient>,
  member: Awaited<ReturnType<typeof requireFamilyMember>>,
  targetChildId: string,
): Promise<void> {
  if (member.role !== 'child') {
    throw new AuthError('Медаль брату или сестре может отправить только ребёнок', 403)
  }
  if (!member.childId) {
    throw new AuthError('Профиль ребёнка не найден', 403)
  }
  if (member.childId === targetChildId) {
    throw new AuthError('Нельзя отправить медаль самому себе', 403)
  }
  await assertChildInFamily(admin, targetChildId, member.familyId)
}

export async function sendKidMedal(params: SendKidMedalParams): Promise<SendKidMedalResult> {
  // Phrase allow-list first — the client never supplies freeform text; this
  // is the server-side enforcement of UI-SPEC content rule 2 (D-11).
  if (!isKnownMedalPhrase(params.phrase)) {
    return { success: false, error: 'Недопустимое сообщение' }
  }

  const admin = createAdminClient()
  let member: Awaited<ReturnType<typeof requireFamilyMember>>
  try {
    member = await requireFamilyMember()
    await assertSiblingTarget(admin, member, params.targetChildId)
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message }
    throw e
  }

  // Sender identity, server-derived — the client never supplies a sender
  // name or role, so D-12's copy can't be forged.
  const { data: senderMember } = await admin
    .from('family_members')
    .select('id, display_name')
    .eq('user_id', member.userId)
    .maybeSingle()
  const senderMemberId = senderMember?.id ?? null

  let senderName = senderMember?.display_name?.trim() || ''
  if (!senderName) {
    const { data: senderChild } = await admin
      .from('children')
      .select('name')
      .eq('id', member.childId as string)
      .maybeSingle()
    senderName = senderChild?.name?.trim() || 'Брат/сестра'
  }

  const today = localDateString()

  // Sender cap (D-10) — at most one kid-sent medal per sender per day, to
  // any recipient.
  const { data: senderCapHit } = await admin
    .from('medals')
    .select('id')
    .eq('sender_member_id', senderMemberId)
    .eq('date', today)
    .eq('sender_role', 'child')
    .maybeSingle()
  if (senderCapHit) {
    return { success: false, error: 'Ты уже отправил медаль сегодня' }
  }

  // Recipient cap (D-09) — at most one kid-sent medal per recipient per day.
  // Deliberately filtered to sender_role='child' so a parent-sent medal the
  // same day does NOT block this.
  const { data: recipientCapHit } = await admin
    .from('medals')
    .select('id')
    .eq('child_id', params.targetChildId)
    .eq('date', today)
    .eq('sender_role', 'child')
    .maybeSingle()
  if (recipientCapHit) {
    return { success: false, error: 'Этому ребёнку уже отправили медаль сегодня' }
  }

  const { error: insertError } = await admin.from('medals').insert({
    family_id: member.familyId,
    child_id: params.targetChildId,
    date: today,
    message: params.phrase,
    coins: 0,
    sent_by: senderName,
    sender_role: 'child',
    sender_member_id: senderMemberId,
  })

  if (insertError) {
    // A race between two concurrent taps hits a unique-violation instead of
    // an app-level check passing twice — map it back to the matching cap
    // message so the user sees the same friendly result either way.
    if (insertError.code === '23505') {
      if (insertError.message.includes('medals_kid_sender_day')) {
        return { success: false, error: 'Ты уже отправил медаль сегодня' }
      }
      if (insertError.message.includes('medals_recipient_day_role')) {
        return { success: false, error: 'Этому ребёнку уже отправили медаль сегодня' }
      }
    }
    return { success: false, error: insertError.message }
  }

  // Feed emit (D-12), non-fatal. The :kid suffix keeps this row from
  // colliding with a parent medal under the family_events_dedup unique key;
  // the card stays money-free per 9.1 D-01.
  void emitFeedEvent({
    familyId: member.familyId,
    childId: params.targetChildId,
    kind: 'medal',
    title: 'Медаль от ' + senderName + ' 🏅',
    body: params.phrase,
    amount: null,
    icon: '🏅',
    refType: 'medal',
    refId: params.targetChildId + ':' + today + ':kid',
    mode: 'once',
    actorMemberId: senderMemberId,
    metadata: { senderRole: 'child', senderName, senderMemberId },
  }, admin)

  // Push — non-fatal (mirror sendMedal). No coin text — coins are always 0.
  try {
    await notifyChild(
      params.targetChildId,
      '🏅 Медаль от ' + senderName + '!',
      params.phrase,
      '/kid/feed'
    )
  } catch (e) {
    console.warn('[sendKidMedal] push failed:', e)
  }

  return { success: true }
}
