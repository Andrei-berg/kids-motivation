import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n')
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get family membership
    const { data: membership, error: memberError } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', userId)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    const familyId = membership.family_id

    // Fetch children
    const { data: children } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', familyId)

    const childIds = (children ?? []).map((c: Record<string, unknown>) => c.id as string)

    // Fetch transactions (wallet_transactions)
    let transactions: Record<string, unknown>[] = []
    if (childIds.length > 0) {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .in('child_id', childIds)
      transactions = data ?? []
    }

    // Fetch subject grades
    let grades: Record<string, unknown>[] = []
    if (childIds.length > 0) {
      const { data } = await supabase
        .from('subject_grades')
        .select('*')
        .in('child_id', childIds)
      grades = data ?? []
    }

    // Fetch chat messages for the family
    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('family_id', familyId)

    // Fetch expenses
    let expenses: Record<string, unknown>[] = []
    if (childIds.length > 0) {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .in('child_id', childIds)
      expenses = data ?? []
    }

    // Fetch days
    let days: Record<string, unknown>[] = []
    if (childIds.length > 0) {
      const { data } = await supabase
        .from('days')
        .select('*')
        .in('child_id', childIds)
      days = data ?? []
    }

    // Fetch badges
    let badges: Record<string, unknown>[] = []
    if (childIds.length > 0) {
      const { data } = await supabase
        .from('badges')
        .select('*')
        .in('child_id', childIds)
      badges = data ?? []
    }

    // Build combined JSON
    const familyData = {
      family_id: familyId,
      exported_at: new Date().toISOString(),
      children: children ?? [],
      transactions,
      subject_grades: grades,
      chat_messages: chatMessages ?? [],
      expenses,
      days,
      badges,
    }

    // Build ZIP
    const zip = new JSZip()
    zip.file('family-data.json', JSON.stringify(familyData, null, 2))
    zip.file('children.csv', toCSV(children ?? []))
    zip.file('transactions.csv', toCSV(transactions))
    zip.file('subject_grades.csv', toCSV(grades))
    zip.file('chat_messages.csv', toCSV(chatMessages ?? []))
    zip.file('expenses.csv', toCSV(expenses))
    zip.file('days.csv', toCSV(days))
    zip.file('badges.csv', toCSV(badges))

    const buffer = await zip.generateAsync({ type: 'arraybuffer' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="family-export.zip"',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
