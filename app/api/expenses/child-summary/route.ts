// GET /api/expenses/child-summary?childId=…
// Raw spend data for ONE child (sections, expense rows, price changes). The
// expenses table is family-wide under RLS, so a kid reads through here and only
// ever gets their own child's rows. Amounts are rubles, summed client-side by
// lib/spend/summary.ts.
import { NextResponse } from 'next/server'
import { createAdminClient, requireFamilyMember } from '@/lib/supabase/admin'
import { authorizeChildAction, errorResponse } from '@/app/api/wallet/_lib'

export async function GET(req: Request) {
  try {
    const member = await requireFamilyMember()
    const childId = new URL(req.url).searchParams.get('childId')
    if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 })

    const admin = createAdminClient()
    await authorizeChildAction(admin, member, childId)

    const [sections, expenses, changes] = await Promise.all([
      admin.from('sections')
        .select('id, name, cost, start_date, end_date, is_active, created_at')
        .eq('child_id', childId).eq('family_id', member.familyId),
      admin.from('expenses')
        .select('id, title, amount, date, section_id, period, category:expense_categories(id, name, icon)')
        .eq('child_id', childId).eq('family_id', member.familyId)
        .order('date', { ascending: false }),
      admin.from('section_price_changes')
        .select('section_id, effective_period, old_cost, new_cost')
        .eq('child_id', childId).eq('family_id', member.familyId),
    ])
    if (sections.error) throw sections.error
    if (expenses.error) throw expenses.error
    // Table may not exist until the migration is applied — degrade to "no changes".
    const priceChanges = changes.error ? [] : changes.data

    return NextResponse.json({
      sections: sections.data,
      expenses: (expenses.data ?? []).map((e: any) => ({
        ...e, amount: Number(e.amount), category: Array.isArray(e.category) ? e.category[0] ?? null : e.category,
      })),
      priceChanges,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
