// app/api/wallet/p2p/route.ts
// Server-side peer-to-peer coin transfer between two children in the same
// family. Fixes the previous client implementation which returned a fake id,
// never persisted the transfer, and skipped the p2p_max_* limits.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireFamilyMember, assertChildInFamily } from '@/lib/supabase/admin'
import { errorResponse, authorizeChildAction, loadWallet, insertTx, loadSettings, applyWalletDelta } from '../_lib'
import { AuthError } from '@/lib/supabase/admin'

const TRANSFER_TYPES = ['gift', 'payment', 'loan', 'deal']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const fromChildId = body.from_child_id
    const toChildId = body.to_child_id
    const amount = Number(body.amount)
    const transferType = body.transfer_type

    if (!fromChildId || !toChildId || fromChildId === toChildId) {
      return NextResponse.json({ error: 'distinct from_child_id and to_child_id required' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 })
    }
    if (!TRANSFER_TYPES.includes(transferType)) {
      return NextResponse.json({ error: 'invalid transfer_type' }, { status: 400 })
    }

    const member = await requireFamilyMember()
    const admin = createAdminClient()
    // Sender must be the caller's own child (if a child) and in the family;
    // recipient must also be in the family.
    await authorizeChildAction(admin, member, fromChildId)
    await assertChildInFamily(admin, toChildId, member.familyId)

    const settings = await loadSettings(admin, member.familyId)
    if (settings.p2p_max_per_transfer && amount > settings.p2p_max_per_transfer) {
      return NextResponse.json({ error: `Лимит на перевод: ${settings.p2p_max_per_transfer}💰` }, { status: 400 })
    }

    // Day / month limits — sum of completed outgoing transfers from this child.
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: recent } = await admin
      .from('p2p_transfers')
      .select('amount, created_at')
      .eq('from_child_id', fromChildId)
      .eq('status', 'completed')
      .gte('created_at', monthStart)
    const monthSum = (recent ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const daySum = (recent ?? [])
      .filter((r) => r.created_at >= dayStart)
      .reduce((s, r) => s + Number(r.amount), 0)
    if (settings.p2p_max_per_day && daySum + amount > settings.p2p_max_per_day) {
      return NextResponse.json({ error: `Дневной лимит переводов: ${settings.p2p_max_per_day}💰` }, { status: 400 })
    }
    if (settings.p2p_max_per_month && monthSum + amount > settings.p2p_max_per_month) {
      return NextResponse.json({ error: `Месячный лимит переводов: ${settings.p2p_max_per_month}💰` }, { status: 400 })
    }

    const fromWallet = await loadWallet(admin, fromChildId)
    if (fromWallet.coins < amount) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
    }
    const toWallet = await loadWallet(admin, toChildId)

    // Persist the transfer record first so transactions can reference it.
    const { data: transfer, error: transferErr } = await admin
      .from('p2p_transfers')
      .insert([{
        from_child_id: fromChildId,
        to_child_id: toChildId,
        amount,
        transfer_type: transferType,
        deal_description: body.deal_description ?? null,
        loan_interest: body.loan_interest ?? null,
        loan_due_date: body.loan_due_date ?? null,
        note: body.note ?? null,
        status: 'completed',
        completed_at: new Date().toISOString(),
        family_id: member.familyId,
      }])
      .select()
      .single()
    if (transferErr) throw transferErr

    // Debit sender atomically with a 0 floor (can't send into the red).
    let fromNewCoins: number
    try {
      const res = await applyWalletDelta(admin, fromChildId, { coins: -amount, spentCoins: amount, minCoins: 0 })
      fromNewCoins = res.coins
    } catch (e) {
      if (e instanceof AuthError && e.status === 400) throw new AuthError('Insufficient coins', 400)
      throw e
    }
    await insertTx(admin, fromChildId, {
      family_id: fromWallet.family_id,
      transaction_type: 'spend_coins',
      coins_change: -amount,
      money_change: 0,
      description: `Перевод → ${toChildId}: ${amount}💰 (${transferType})`,
      icon: '💸',
      related_id: transfer.id,
      related_type: 'p2p',
      balance_after_coins: fromNewCoins,
      balance_after_money: Number(fromWallet.money),
    })

    // Credit recipient atomically (no floor).
    const { coins: toNewCoins } = await applyWalletDelta(admin, toChildId, { coins: amount, earnedCoins: amount })
    await insertTx(admin, toChildId, {
      family_id: toWallet.family_id,
      transaction_type: 'earn_coins',
      coins_change: amount,
      money_change: 0,
      description: `Перевод от ${fromChildId}: ${amount}💰 (${transferType})`,
      icon: '💰',
      related_id: transfer.id,
      related_type: 'p2p',
      balance_after_coins: toNewCoins,
      balance_after_money: Number(toWallet.money),
    })

    return NextResponse.json({ ok: true, transfer })
  } catch (err) {
    return errorResponse(err)
  }
}
