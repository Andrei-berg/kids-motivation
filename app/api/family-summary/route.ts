import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get family membership
    const { data: membership, error: memberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    const familyId = membership.family_id

    // Count children
    const { count: childCount } = await supabase
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId)

    // Get child IDs to count their data
    const { data: children } = await supabase
      .from('children')
      .select('id')
      .eq('family_id', familyId)

    const childIds = (children ?? []).map((c: { id: string }) => c.id)

    let transactionCount = 0
    let gradeCount = 0

    if (childIds.length > 0) {
      const { count: txCount } = await supabase
        .from('wallet_transactions')
        .select('id', { count: 'exact', head: true })
        .in('child_id', childIds)

      const { count: gCount } = await supabase
        .from('subject_grades')
        .select('id', { count: 'exact', head: true })
        .in('child_id', childIds)

      transactionCount = txCount ?? 0
      gradeCount = gCount ?? 0
    }

    return NextResponse.json({
      children: childCount ?? 0,
      transactions: transactionCount,
      grades: gradeCount,
    })
  } catch {
    return NextResponse.json({ error: 'Summary failed' }, { status: 500 })
  }
}
