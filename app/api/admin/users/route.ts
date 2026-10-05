import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isTokenValid } from '@/lib/kite'

function isAdmin(sessionClaims: unknown) {
  return (sessionClaims as Record<string, unknown>)?.role === 'admin'
}

// GET /api/admin/users
export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId || !isAdmin(sessionClaims?.metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, clerk_user_id, email, full_name, is_active, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (!users) return NextResponse.json([])

  const enriched = await Promise.all(users.map(async u => {
    const [credsResult, qResult] = await Promise.all([
      supabaseAdmin
        .from('kite_credentials')
        .select('is_connected, token_date')
        .eq('user_id', u.id)
        .single(),
      supabaseAdmin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id),
    ])

    const creds = credsResult.data
    const kite_connected = !!(creds?.is_connected && isTokenValid(creds.token_date))

    return {
      ...u,
      kite_connected,
      question_count: qResult.count ?? 0,
    }
  }))

  return NextResponse.json(enriched)
}

// PATCH /api/admin/users — block or unblock a user
export async function PATCH(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId || !isAdmin(sessionClaims?.metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id, is_active } = await req.json()
  if (!user_id || typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'user_id and is_active required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ is_active })
    .eq('id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
