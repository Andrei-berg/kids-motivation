'use server'

// Parent verification of a child's reading. The kid's "finished a book" claim is
// held (reading_log.verified = null) until a parent confirms it — the child
// retells the book — at which point the book bonus is credited. All coin movement
// is server-side via the service-role client (money tables are RLS read-only).

import { createAdminClient, requireParent, assertChildInFamily } from '@/lib/supabase/admin'
import { loadSettings, creditAwards } from '@/app/api/wallet/_lib'

export async function approveReadingAction(childId: string, date: string): Promise<{ creditedCoins: number }> {
  const member = await requireParent()
  const admin = createAdminClient()
  await assertChildInFamily(admin, childId, member.familyId)

  const { data: reading } = await admin
    .from('reading_log')
    .select('id, book_title, book_finished, verified')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle()
  if (!reading) throw new Error('Reading not found')

  await admin.from('reading_log').update({ verified: true }).eq('id', reading.id)

  let creditedCoins = 0
  if (reading.book_finished) {
    const settings = await loadSettings(admin, member.familyId)
    if (settings.coins_per_book > 0) {
      // Idempotent per (child, 'book', reading.id) — safe if approved twice.
      const res = await creditAwards(admin, childId, [{
        coins: settings.coins_per_book,
        description: `Книга: ${reading.book_title}`,
        icon: '📚',
        sourceType: 'book',
        sourceId: reading.id,
      }])
      creditedCoins = res.creditedCoins
    }
  }

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(childId, 'Чтение подтверждено! 📚', creditedCoins > 0 ? `+${creditedCoins} 🪙` : 'Молодец!', '/kid/wallet')
  } catch (e) {
    console.warn('[approveReadingAction] push failed:', e)
  }

  return { creditedCoins }
}

export async function rejectReadingAction(childId: string, date: string): Promise<{ ok: true }> {
  const member = await requireParent()
  const admin = createAdminClient()
  await assertChildInFamily(admin, childId, member.familyId)

  const { data: reading } = await admin
    .from('reading_log')
    .select('id')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle()
  if (!reading) throw new Error('Reading not found')

  await admin.from('reading_log').update({ verified: false }).eq('id', reading.id)

  try {
    const { notifyChild } = await import('@/app/actions/push-notifications')
    await notifyChild(childId, 'Расскажи про книгу 📖', 'Перескажи родителю, о чём она', '/kid/day')
  } catch (e) {
    console.warn('[rejectReadingAction] push failed:', e)
  }

  return { ok: true }
}

/** Per-child flexibility toggle: require parent verification of reading (default on). */
export async function setRequireReadingCheckAction(childId: string, value: boolean): Promise<{ ok: true }> {
  const member = await requireParent()
  const admin = createAdminClient()
  await assertChildInFamily(admin, childId, member.familyId)
  await admin.from('children').update({ require_reading_check: value }).eq('id', childId)
  return { ok: true }
}
