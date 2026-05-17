import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE() {
  try {
    const supabase = await createClient()

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get family membership — must be parent role
    const { data: membership, error: memberError } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', userId)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    if (membership.role !== 'parent') {
      return NextResponse.json({ error: 'Only parents can delete the family account' }, { status: 403 })
    }

    const familyId = membership.family_id

    // Get all children in the family
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id')
      .eq('family_id', familyId)

    if (childrenError) {
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
    }

    const childIds = (children ?? []).map((c: { id: string }) => c.id)

    // 1. Delete chat messages for the family
    await supabase.from('chat_messages').delete().eq('family_id', familyId)

    // 2. For each child, cascade delete their data
    if (childIds.length > 0) {
      await supabase.from('wallet_transactions').delete().in('child_id', childIds)
      await supabase.from('wallet').delete().in('child_id', childIds)
      await supabase.from('subject_grades').delete().in('child_id', childIds)
      await supabase.from('days').delete().in('child_id', childIds)
      await supabase.from('home_sports').delete().in('child_id', childIds)
      await supabase.from('streaks').delete().in('child_id', childIds)
      await supabase.from('reward_purchases').delete().in('child_id', childIds)
      await supabase.from('badges').delete().in('child_id', childIds)
      await supabase.from('expenses').delete().in('child_id', childIds)
    }

    // 3. Delete children
    await supabase.from('children').delete().eq('family_id', familyId)

    // 4. Delete family members
    await supabase.from('family_members').delete().eq('family_id', familyId)

    // 5. Delete family
    await supabase.from('families').delete().eq('id', familyId)

    // 6. Delete auth user via admin client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey && serviceKey !== 'your_supabase_service_role_key') {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
      )
      await adminClient.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ deleted: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
