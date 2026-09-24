import { NextResponse } from 'next/server'
import { AuthError, createAdminClient, requireParent } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { familyId } = await requireParent()
    const { data } = await createAdminClient().from('tv_devices')
      .select('id,name,created_at,last_seen_at').eq('family_id', familyId).eq('status', 'active').order('created_at')
    return NextResponse.json({ devices: data ?? [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { familyId } = await requireParent()
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await createAdminClient().from('tv_devices').update({ status: 'revoked' }).eq('id', id).eq('family_id', familyId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
