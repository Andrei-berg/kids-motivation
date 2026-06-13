import { NextResponse } from 'next/server'
import { createAdminClient, requireParent, AuthError } from '@/lib/supabase/admin'

export async function DELETE() {
  try {
    // Only a parent may delete the family account. requireParent re-validates
    // the JWT and checks the role.
    const member = await requireParent()
    const familyId = member.familyId
    const userId = member.userId

    // All cascade deletes run via the service-role client. This is required now
    // that the wallet/* tables are RLS-locked to SELECT for clients — the
    // parent's own session can no longer DELETE them directly.
    const admin = createAdminClient()

    const { data: children, error: childrenError } = await admin
      .from('children')
      .select('id')
      .eq('family_id', familyId)
    if (childrenError) {
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
    }
    const childIds = (children ?? []).map((c: { id: string }) => c.id)

    // 1. Chat messages for the family
    await admin.from('chat_messages').delete().eq('family_id', familyId)

    // 2. Per-child data
    if (childIds.length > 0) {
      await admin.from('wallet_transactions').delete().in('child_id', childIds)
      await admin.from('wallet').delete().in('child_id', childIds)
      await admin.from('subject_grades').delete().in('child_id', childIds)
      await admin.from('days').delete().in('child_id', childIds)
      await admin.from('home_sports').delete().in('child_id', childIds)
      await admin.from('streaks').delete().in('child_id', childIds)
      await admin.from('reward_purchases').delete().in('child_id', childIds)
      await admin.from('badges').delete().in('child_id', childIds)
      await admin.from('expenses').delete().in('child_id', childIds)
    }

    // 3. Children
    await admin.from('children').delete().eq('family_id', familyId)
    // 4. Family members
    await admin.from('family_members').delete().eq('family_id', familyId)
    // 5. Family
    await admin.from('families').delete().eq('id', familyId)

    // 6. Delete the parent's auth user.
    await admin.auth.admin.deleteUser(userId)

    return NextResponse.json({ deleted: true }, { status: 200 })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
