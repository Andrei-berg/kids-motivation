import { NextResponse } from 'next/server'
import { AuthError, createAdminClient, requireParent } from '@/lib/supabase/admin'

// Parent enters the code shown on the TV.
export async function POST(req: Request) {
  try {
    const { familyId } = await requireParent()
    const body = await req.json().catch(() => ({}))
    const code = String(body.code ?? '').replace(/\D/g, '')
    if (code.length !== 6) return NextResponse.json({ error: 'Введите 6 цифр с экрана ТВ' }, { status: 400 })
    const name = String(body.name ?? '').trim().slice(0, 40) || 'ТВ'

    const admin = createAdminClient()
    const { data, error } = await admin.from('tv_devices')
      .update({ family_id: familyId, status: 'active', pair_code: null, code_expires: null, name })
      .eq('pair_code', code).eq('status', 'pending').gt('code_expires', new Date().toISOString())
      .select('id').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Код не найден или устарел. Обновите экран ТВ.' }, { status: 404 })
    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }
}
