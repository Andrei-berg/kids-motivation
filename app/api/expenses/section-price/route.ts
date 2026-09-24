// POST /api/expenses/section-price   (parent only)
// body: { sectionId, cost, effectiveFrom?: 'YYYY-MM' }
//
// Changes a section's monthly price FROM a month onward: months before it keep
// the price actually paid; the effective month and later (up to the current
// month) are rewritten/created at the new price; sections.cost is updated for
// future months; the change is logged in section_price_changes.
import { NextResponse } from 'next/server'
import { createAdminClient, requireParent, assertChildInFamily } from '@/lib/supabase/admin'
import { errorResponse } from '@/app/api/wallet/_lib'
import { localDateString } from '@/utils/helpers'

const YM = /^\d{4}-(0[1-9]|1[0-2])$/

export async function POST(req: Request) {
  try {
    const parent = await requireParent()
    const { sectionId, cost, effectiveFrom } = await req.json()
    const newCost = Number(cost)
    if (!sectionId || !Number.isFinite(newCost) || newCost <= 0) {
      return NextResponse.json({ error: 'sectionId and a positive cost are required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: section } = await admin.from('sections')
      .select('id, name, cost, child_id, family_id').eq('id', sectionId).maybeSingle()
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    await assertChildInFamily(admin, section.child_id, parent.familyId)

    const curYM = localDateString().slice(0, 7)
    const from: string = effectiveFrom && YM.test(effectiveFrom) ? effectiveFrom : curYM

    const oldCost = section.cost == null ? null : Number(section.cost)
    if (oldCost === newCost) return NextResponse.json({ ok: true, unchanged: true })

    const { error: upErr } = await admin.from('sections').update({ cost: newCost }).eq('id', sectionId)
    if (upErr) throw upErr

    // Rewrite saved month rows from `from` on (never earlier months).
    const { error: rowsErr } = await admin.from('expenses')
      .update({ amount: newCost }).eq('section_id', sectionId).gte('period', from)
    if (rowsErr) throw rowsErr

    // The change is logged even if the history table isn't migrated yet.
    const { error: logErr } = await admin.from('section_price_changes').insert({
      family_id: parent.familyId, section_id: sectionId, child_id: section.child_id,
      effective_period: from, old_cost: oldCost, new_cost: newCost, changed_by: parent.userId,
    })
    if (logErr) console.error('[section-price] history not logged:', logErr.message)

    return NextResponse.json({ ok: true, from, oldCost, newCost })
  } catch (err) {
    return errorResponse(err)
  }
}
