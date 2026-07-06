// app/api/wallet/exchange/route.ts
// Server-side coin → money exchange. Rate/bonus computed server-side from the
// family's wallet_settings; client sends only { childId, coinsAmount }.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { errorResponse, authorizeChildAction, loadWallet, insertTx, loadSettings, applyWalletDelta } from '../_lib'
import { AuthError } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { childId, coinsAmount } = await req.json()
    const coins = Number(coinsAmount)
    if (!childId || !Number.isFinite(coins) || coins <= 0 || !Number.isInteger(coins)) {
      return NextResponse.json({ error: 'childId and a positive integer coinsAmount required' }, { status: 400 })
    }

    const member = await requireFamilyMember()
    const admin = createAdminClient()
    await authorizeChildAction(admin, member, childId)

    const wallet = await loadWallet(admin, childId)
    if (wallet.coins < coins) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
    }

    const settings = await loadSettings(admin, member.familyId)
    let bonus = 0
    if (wallet.coins >= 1000) bonus = settings.bonus_1000_coins
    else if (wallet.coins >= 500) bonus = settings.bonus_500_coins
    else if (wallet.coins >= 100) bonus = settings.bonus_100_coins
    const rate = settings.base_exchange_rate * (1 + bonus / 100)
    const moneyAmount = coins * rate

    // Atomic debit-coins / credit-money with a 0 coin floor so concurrency can't
    // exchange more coins than the child holds. Returned balances are authoritative.
    let newCoins: number, newMoney: number
    try {
      const res = await applyWalletDelta(admin, childId, {
        coins: -coins,
        money: moneyAmount,
        exchangedCoins: coins,
        earnedMoney: moneyAmount,
        minCoins: 0,
      })
      newCoins = res.coins
      newMoney = res.money
    } catch (e) {
      if (e instanceof AuthError && e.status === 400) throw new AuthError('Insufficient coins', 400)
      throw e
    }

    const { data: exchange, error: insErr } = await admin
      .from('coin_exchanges')
      .insert([{
        child_id: childId,
        coins_amount: coins,
        money_amount: moneyAmount,
        exchange_rate: rate,
        bonus_rate: bonus,
        balance_after_coins: newCoins,
        balance_after_money: newMoney,
      }])
      .select()
      .single()
    if (insErr) throw insErr

    await insertTx(admin, childId, {
      family_id: wallet.family_id,
      transaction_type: 'exchange',
      coins_change: -coins,
      money_change: moneyAmount,
      description: `Обменяно: ${coins} монет → ${moneyAmount.toFixed(0)}₽`,
      icon: '💱',
      related_id: exchange.id,
      related_type: 'exchange',
      balance_after_coins: newCoins,
      balance_after_money: newMoney,
    })

    return NextResponse.json({ ok: true, exchange })
  } catch (err) {
    return errorResponse(err)
  }
}
