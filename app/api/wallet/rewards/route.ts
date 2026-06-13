// app/api/wallet/rewards/route.ts
// Parent-only reward management (create / update / delete). Reads stay on the
// client (RLS allows SELECT); only writes go through here under service-role.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireParent } from '@/lib/supabase/admin'
import { errorResponse } from '../_lib'

export async function POST(req: NextRequest) {
  try {
    const reward = await req.json()
    const member = await requireParent()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('rewards')
      .insert([{ ...reward, created_by: member.userId, family_id: member.familyId }])
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, reward: data })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { rewardId, updates } = await req.json()
    if (!rewardId || !updates) {
      return NextResponse.json({ error: 'rewardId and updates required' }, { status: 400 })
    }
    const member = await requireParent()
    const admin = createAdminClient()

    // Never allow family_id / created_by to be reassigned via update.
    const { family_id, created_by, id, ...safe } = updates
    void family_id; void created_by; void id

    const { data, error } = await admin
      .from('rewards')
      .update(safe)
      .eq('id', rewardId)
      .eq('family_id', member.familyId)
      .select()
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    return NextResponse.json({ ok: true, reward: data })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { rewardId } = await req.json()
    if (!rewardId) return NextResponse.json({ error: 'rewardId required' }, { status: 400 })
    const member = await requireParent()
    const admin = createAdminClient()

    const { error } = await admin
      .from('rewards')
      .delete()
      .eq('id', rewardId)
      .eq('family_id', member.familyId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
