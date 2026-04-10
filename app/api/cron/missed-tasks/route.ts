// app/api/cron/missed-tasks/route.ts
// Vercel Cron: runs daily at 20:00 UTC (declared in vercel.json)
// Checks if children have unfilled required tasks today; notifies parent(s)
// Auth: CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToSubscription } from '@/app/actions/push'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth guard
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0] // "YYYY-MM-DD" UTC

  // Day of week: JS Sunday=0 → ISO Monday=1 … Sunday=7
  const jsDay = now.getDay()
  const todayDow = jsDay === 0 ? 7 : jsDay

  // 1. Get all active routine schedule items for today
  const { data: routineItems, error: routineErr } = await supabase
    .from('schedule_items')
    .select('child_member_id, title')
    .eq('type', 'routine')
    .eq('is_active', true)
    .filter('day_of_week', 'cs', JSON.stringify([todayDow]))

  if (routineErr || !routineItems || routineItems.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no routine items today' })
  }

  // 2. Group required tasks by child
  const childTasks = new Map<string, string[]>()
  for (const item of routineItems) {
    const existing = childTasks.get(item.child_member_id) ?? []
    existing.push(item.title)
    childTasks.set(item.child_member_id, existing)
  }

  // 3. For each child, check if a day row exists for today
  const childIds = Array.from(childTasks.keys())
  const { data: dayRows } = await supabase
    .from('days')
    .select('child_id')
    .eq('date', today)
    .in('child_id', childIds)

  const filledChildIds = new Set((dayRows ?? []).map((d) => d.child_id))

  // 4. Find children who did NOT fill their day
  const missedChildIds = childIds.filter((id) => !filledChildIds.has(id))

  if (missedChildIds.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'all children filled their day' })
  }

  // 5. For each missed child, find their family and parent subscriptions
  // Fetch both missed children and all children to get family_id info
  const allMemberIds = Array.from(new Set(missedChildIds.concat(childIds)))
  const { data: members } = await supabase
    .from('family_members')
    .select('id, family_id, display_name, role')
    .in('id', allMemberIds)

  if (!members || members.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no members found' })
  }

  const memberById = new Map(members.map((m) => [m.id, m]))

  // Get family IDs for missed children to fetch all parents in those families
  const familyIds = Array.from(
    new Set(
      missedChildIds
        .map((id) => memberById.get(id)?.family_id)
        .filter((fid): fid is string => Boolean(fid))
    )
  )

  // Fetch all parent members for those families
  const { data: parentMembers } = await supabase
    .from('family_members')
    .select('id, family_id, role')
    .in('family_id', familyIds)
    .eq('role', 'parent')

  if (!parentMembers || parentMembers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no parent members found' })
  }

  // Build family_id → parent_member_ids mapping
  const familyParents = new Map<string, string[]>()
  for (const m of parentMembers) {
    const existing = familyParents.get(m.family_id) ?? []
    existing.push(m.id)
    familyParents.set(m.family_id, existing)
  }

  // Collect all parent member IDs we need to notify
  const parentMemberIds = new Set<string>()
  for (const childMemberId of missedChildIds) {
    const childMember = memberById.get(childMemberId)
    if (!childMember) continue
    const parents = familyParents.get(childMember.family_id) ?? []
    parents.forEach((pid) => parentMemberIds.add(pid))
  }

  if (parentMemberIds.size === 0) {
    return NextResponse.json({ sent: 0, reason: 'no parent member IDs resolved' })
  }

  // 6. Fetch parent push subscriptions
  const { data: parentSubs } = await supabase
    .from('push_subscriptions')
    .select('member_id, subscription')
    .in('member_id', Array.from(parentMemberIds))

  if (!parentSubs || parentSubs.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no parent subscriptions' })
  }

  const subsByParent = new Map<string, string[]>()
  for (const sub of parentSubs) {
    const existing = subsByParent.get(sub.member_id) ?? []
    existing.push(JSON.stringify(sub.subscription))
    subsByParent.set(sub.member_id, existing)
  }

  // 7. Send notifications to parents for each missed child
  const sends: Promise<void>[] = []

  for (const childMemberId of missedChildIds) {
    const childMember = memberById.get(childMemberId)
    if (!childMember) continue

    const tasks = childTasks.get(childMemberId) ?? []
    const childName = childMember.display_name ?? 'Ребёнок'

    const title = `${childName} не заполнил(а) день`
    const body = `Пропущено задач: ${tasks.length}`

    const familyParentIds = familyParents.get(childMember.family_id) ?? []
    for (const parentId of familyParentIds) {
      const subs = subsByParent.get(parentId) ?? []
      for (const subJson of subs) {
        sends.push(sendPushToSubscription(subJson, title, body, '/parent/dashboard'))
      }
    }
  }

  const results = await Promise.allSettled(sends)
  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    sent,
    failed,
    missedChildren: missedChildIds.length,
  })
}
