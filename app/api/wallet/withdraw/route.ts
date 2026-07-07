// app/api/wallet/withdraw/route.ts
// Server-side cash withdrawal REQUEST. No balance change here — money is
// deducted when a parent approves (see /api/wallet/withdraw/approve). Client
// sends { childId, amount }.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { errorResponse, authorizeChildAction, loadWallet } from '../_lib'

export async function POST(req: NextRequest) {
  try {
    const { childId, amount } = await req.json()
    const amt = Number(amount)
    if (!childId || !Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'childId and a positive amount required' }, { status: 400 })
    }

    const member = await requireFamilyMember()
    const admin = createAdminClient()
    await authorizeChildAction(admin, member, childId)

    const wallet = await loadWallet(admin, childId)

    // Pending withdrawals reserve funds: a new request must fit into the
    // balance minus everything already awaiting approval, otherwise two
    // pending requests could both be approved against the same money.
    const { data: pendingRows, error: pendErr } = await admin
      .from('cash_withdrawals')
      .select('amount')
      .eq('child_id', childId)
      .eq('status', 'pending')
    if (pendErr) throw pendErr
    const reserved = (pendingRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
    if (Number(wallet.money) < amt + reserved) {
      return NextResponse.json({ error: 'Insufficient money' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('cash_withdrawals')
      .insert([{
        child_id: childId,
        amount: amt,
        balance_after_money: Number(wallet.money) - reserved - amt,
      }])
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ ok: true, withdrawal: data })
  } catch (err) {
    return errorResponse(err)
  }
}
