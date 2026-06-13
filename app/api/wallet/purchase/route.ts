// app/api/wallet/purchase/route.ts
// Server-side reward purchase request. Coins are deducted immediately (matching
// the existing createPurchaseRequest behaviour); auto_approve rewards land as
// 'approved', others as 'pending' for parent fulfilment. The client sends only
// { childId, rewardId } — price and balance checks happen server-side.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { errorResponse, authorizeChildAction, loadWallet, insertTx } from '../_lib'

export async function POST(req: NextRequest) {
  try {
    const { childId, rewardId } = await req.json()
    if (!childId || !rewardId) {
      return NextResponse.json({ error: 'childId and rewardId required' }, { status: 400 })
    }

    const member = await requireFamilyMember()
    const admin = createAdminClient()
    await authorizeChildAction(admin, member, childId)

    const { data: reward, error: rewardErr } = await admin
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('family_id', member.familyId)
      .maybeSingle()
    if (rewardErr || !reward) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    if (!reward.is_active) return NextResponse.json({ error: 'Reward is not active' }, { status: 400 })

    const wallet = await loadWallet(admin, childId)

    const isCoins = reward.reward_type === 'coins'
    const priceCoins = isCoins ? reward.price_coins || 0 : 0
    if (isCoins && wallet.coins < priceCoins) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
    }

    const autoApprove = reward.auto_approve === true
    const newCoins = wallet.coins - priceCoins

    if (priceCoins > 0) {
      const { error: updErr } = await admin
        .from('wallet')
        .update({ coins: newCoins, total_spent_coins: wallet.total_spent_coins + priceCoins })
        .eq('child_id', childId)
      if (updErr) throw updErr
    }

    const purchase = {
      reward_id: rewardId,
      child_id: childId,
      reward_title: reward.title,
      reward_icon: reward.icon,
      reward_type: reward.reward_type,
      price_coins: reward.price_coins,
      price_money: reward.price_money,
      status: autoApprove ? 'approved' : 'pending',
      frozen_coins: 0,
      fulfilled: false,
      ...(autoApprove ? { processed_by: 'auto', processed_at: new Date().toISOString() } : {}),
      balance_after_coins: newCoins,
      balance_after_money: Number(wallet.money),
      family_id: member.familyId,
    }

    const { data: created, error: insErr } = await admin
      .from('reward_purchases')
      .insert([purchase])
      .select()
      .single()
    if (insErr) throw insErr

    await admin
      .from('rewards')
      .update({ purchase_count: (reward.purchase_count ?? 0) + 1 })
      .eq('id', rewardId)

    if (priceCoins > 0) {
      await insertTx(admin, childId, {
        family_id: member.familyId,
        transaction_type: 'spend_coins',
        coins_change: -priceCoins,
        money_change: 0,
        description: `Куплено: ${reward.title}`,
        icon: reward.icon,
        related_id: created.id,
        related_type: 'reward',
        balance_after_coins: newCoins,
        balance_after_money: Number(wallet.money),
      })
    }

    return NextResponse.json({ ok: true, purchase: created })
  } catch (err) {
    return errorResponse(err)
  }
}
