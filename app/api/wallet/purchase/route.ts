// app/api/wallet/purchase/route.ts
// Server-side reward purchase request. Coins are deducted immediately (matching
// the existing createPurchaseRequest behaviour); auto_approve rewards land as
// 'approved', others as 'pending' for parent fulfilment. The client sends only
// { childId, rewardId } — price and balance checks happen server-side.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { errorResponse, authorizeChildAction, processPurchase } from '../_lib'

export async function POST(req: NextRequest) {
  try {
    const { childId, rewardId } = await req.json()
    if (!childId || !rewardId) {
      return NextResponse.json({ error: 'childId and rewardId required' }, { status: 400 })
    }

    const member = await requireFamilyMember()
    const admin = createAdminClient()
    await authorizeChildAction(admin, member, childId)

    const purchase = await processPurchase(admin, member.familyId, childId, rewardId)
    return NextResponse.json({ ok: true, purchase })
  } catch (err) {
    return errorResponse(err)
  }
}
