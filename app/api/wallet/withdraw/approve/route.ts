// app/api/wallet/withdraw/approve/route.ts
// Server-side withdrawal decision (parent-only). Client sends
// { withdrawalId, action: 'approve' | 'reject', note? }. Money moves ONLY here:
// approve debits the child's money atomically via wallet_apply with a 0 floor
// (a concurrent spend can never drive the balance negative); reject just closes
// the request. The request route (/api/wallet/withdraw) reserves but never debits.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireParent, assertChildInFamily, AuthError } from '@/lib/supabase/admin'
import { errorResponse, loadWallet, insertTx, applyWalletDelta } from '../../_lib'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'

export async function POST(req: NextRequest) {
  try {
    const { withdrawalId, action, note } = await req.json()
    if (!withdrawalId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'withdrawalId and action (approve|reject) required' },
        { status: 400 },
      )
    }

    const member = await requireParent()
    const admin = createAdminClient()

    const { data: withdrawal, error: fetchError } = await admin
      .from('cash_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }
    await assertChildInFamily(admin, withdrawal.child_id, member.familyId)
    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 409 })
    }

    // Conditional pending → terminal flip is the double-processing guard:
    // of two concurrent decisions only one matches status = 'pending'.
    const { data: flipped, error: flipError } = await admin
      .from('cash_withdrawals')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        processed_by: 'parent',
        processed_at: new Date().toISOString(),
        note: note || null,
      })
      .eq('id', withdrawalId)
      .eq('status', 'pending')
      .select()
      .maybeSingle()
    if (flipError) throw flipError
    if (!flipped) {
      return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 409 })
    }

    if (action === 'reject') {
      void insertAuditEvent({
        family_id: member.familyId,
        child_id: withdrawal.child_id,
        action_type: 'withdraw_reject',
        description: `Rejected cash withdrawal: ${withdrawal.amount}₽`,
        coins_delta: null,
        actor_user_id: member.userId,
        metadata: { withdrawal_id: withdrawalId },
      })
      return NextResponse.json({ ok: true, withdrawal: flipped })
    }

    const amount = Number(withdrawal.amount)
    const wallet = await loadWallet(admin, withdrawal.child_id)

    let newMoney: number, newCoins: number
    try {
      const res = await applyWalletDelta(admin, withdrawal.child_id, {
        money: -amount,
        spentMoney: amount,
        minMoney: 0,
      })
      newMoney = res.money
      newCoins = res.coins
    } catch (err) {
      // Compensate: reopen the request so it isn't stuck approved-but-undebited.
      await admin
        .from('cash_withdrawals')
        .update({ status: 'pending', processed_by: null, processed_at: null, note: null })
        .eq('id', withdrawalId)
      if (err instanceof AuthError && err.status === 400) {
        throw new AuthError('Insufficient money', 400)
      }
      throw err
    }

    const { data: settled, error: settleError } = await admin
      .from('cash_withdrawals')
      .update({ balance_after_money: newMoney })
      .eq('id', withdrawalId)
      .select()
      .single()
    if (settleError) throw settleError

    await insertTx(admin, withdrawal.child_id, {
      family_id: wallet.family_id,
      transaction_type: 'withdraw',
      coins_change: 0,
      money_change: -amount,
      description: `Выведено наличными: ${amount}₽`,
      icon: '💵',
      related_id: withdrawalId,
      related_type: 'withdrawal',
      balance_after_coins: newCoins,
      balance_after_money: newMoney,
    })

    try {
      const { notifyChild } = await import('@/app/actions/push-notifications')
      await notifyChild(
        withdrawal.child_id,
        'Вывод одобрен! 💵',
        `${amount}₽ — забери у родителей`,
        '/kid/wallet',
      )
    } catch (e) {
      console.warn('[withdraw/approve] push failed:', e)
    }

    void insertAuditEvent({
      family_id: member.familyId,
      child_id: withdrawal.child_id,
      action_type: 'withdraw_approve',
      description: `Approved cash withdrawal: ${amount}₽`,
      coins_delta: null,
      actor_user_id: member.userId,
      metadata: { withdrawal_id: withdrawalId, amount },
    })

    return NextResponse.json({ ok: true, withdrawal: settled })
  } catch (err) {
    return errorResponse(err)
  }
}
