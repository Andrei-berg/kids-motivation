// POST /api/expenses/handout   (parent only)
// body: { childId, amount, title?, date? }
// One-tap "gave the kid 50/100 ₽ for ice cream / sweets". Stored as a normal
// expense in the «Мелочи» category (created on first use).
import { NextResponse } from 'next/server'
import { createAdminClient, requireParent, assertChildInFamily } from '@/lib/supabase/admin'
import { errorResponse } from '@/app/api/wallet/_lib'
import { localDateString } from '@/utils/helpers'

const CATEGORY = { name: 'Мелочи', icon: '🍦' }

export async function POST(req: Request) {
  try {
    const parent = await requireParent()
    const { childId, amount, title, date } = await req.json()
    const value = Number(amount)
    if (!childId || !Number.isFinite(value) || value <= 0 || value > 100000) {
      return NextResponse.json({ error: 'childId and a positive amount are required' }, { status: 400 })
    }

    const admin = createAdminClient()
    await assertChildInFamily(admin, childId, parent.familyId)

    let { data: cat } = await admin.from('expense_categories')
      .select('id').eq('family_id', parent.familyId).eq('name', CATEGORY.name).limit(1).maybeSingle()
    if (!cat) {
      const { data, error } = await admin.from('expense_categories')
        .insert({ ...CATEGORY, is_default: false, is_active: true, family_id: parent.familyId })
        .select('id').single()
      if (error) throw error
      cat = data
    }

    const { data, error } = await admin.from('expenses').insert({
      child_id: childId, family_id: parent.familyId, category_id: cat!.id,
      title: (typeof title === 'string' && title.trim()) || 'Мелочи',
      amount: value, date: date || localDateString(), is_recurring: false,
      created_by: parent.userId,
    }).select('id').single()
    if (error) throw error

    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    return errorResponse(err)
  }
}
