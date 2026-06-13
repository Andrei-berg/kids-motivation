// app/api/wallet/settings/route.ts
// Parent-only wallet settings update (coin rules, exchange rates, p2p limits).
// Reads stay on the client (RLS allows SELECT); writes go through here.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, requireParent } from '@/lib/supabase/admin'
import { errorResponse } from '../_lib'

export async function PATCH(req: NextRequest) {
  try {
    const updates = await req.json()
    const member = await requireParent()
    const admin = createAdminClient()

    // id / family_id are derived from the authenticated parent — never trusted.
    const { id, family_id, updated_at, ...safe } = updates ?? {}
    void id; void family_id; void updated_at

    const { data, error } = await admin
      .from('wallet_settings')
      .upsert({
        id: member.familyId,
        family_id: member.familyId,
        ...safe,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, settings: data })
  } catch (err) {
    return errorResponse(err)
  }
}
