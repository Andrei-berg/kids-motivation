// app/api/wallet/payout/route.ts   (parent only)
// body: { childId, rubles, preview? }
// Parent handed the child real money ("перевёл 100 ₽") → the matching coins are
// taken off the child's balance at the family's exchange rate (same rate/bonus
// maths as /api/wallet/exchange). With preview:true nothing is written.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireParent, assertChildInFamily, AuthError } from '@/lib/supabase/admin'
import { errorResponse, loadWallet, insertTx, loadSettings, applyWalletDelta } from '../_lib'

export async function POST(req: NextRequest) {
  try {
    const { childId, rubles, preview } = await req.json()
    const rub = Number(rubles)
    if (!childId || !Number.isFinite(rub) || rub <= 0 || rub > 1_000_000) {
      return NextResponse.json({ error: 'childId and a positive rubles amount required' }, { status: 400 })
    }

    const parent = await requireParent()
    const admin = createAdminClient()
    await assertChildInFamily(admin, childId, parent.familyId)

    const wallet = await loadWallet(admin, childId)
    const settings = await loadSettings(admin, parent.familyId)
    let bonus = 0
    if (wallet.coins >= 1000) bonus = settings.bonus_1000_coins
    else if (wallet.coins >= 500) bonus = settings.bonus_500_coins
    else if (wallet.coins >= 100) bonus = settings.bonus_100_coins
    const rate = settings.base_exchange_rate * (1 + bonus / 100) // ₽ per coin
    const coins = Math.max(1, Math.ceil(rub / rate))

    if (preview) return NextResponse.json({ ok: true, coins, rate, balance: wallet.coins })
    if (wallet.coins < coins) {
      return NextResponse.json({ error: 'Insufficient coins', coins, balance: wallet.coins }, { status: 400 })
    }

    let newCoins: number, newMoney: number
    try {
      const res = await applyWalletDelta(admin, childId, { coins: -coins, money: 0, exchangedCoins: coins, minCoins: 0 })
      newCoins = res.coins; newMoney = res.money
    } catch (e) {
      if (e instanceof AuthError && e.status === 400) throw new AuthError('Insufficient coins', 400)
      throw e
    }

    const { data: exchange, error } = await admin.from('coin_exchanges').insert([{
      child_id: childId, coins_amount: coins, money_amount: rub, exchange_rate: rate, bonus_rate: bonus,
      balance_after_coins: newCoins, balance_after_money: newMoney,
    }]).select().single()
    if (error) throw error

    await insertTx(admin, childId, {
      family_id: wallet.family_id,
      transaction_type: 'exchange',
      coins_change: -coins,
      money_change: 0,
      description: `Перевод ${rub}₽ родителем: −${coins} монет`,
      icon: '💸',
      related_id: exchange.id,
      related_type: 'exchange',
      balance_after_coins: newCoins,
      balance_after_money: newMoney,
    })

    return NextResponse.json({ ok: true, coins, balance: newCoins })
  } catch (err) {
    return errorResponse(err)
  }
}
