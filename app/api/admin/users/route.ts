import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getFyersFunds } from '@/lib/fyers'
import { decrypt } from '@/lib/encryption'

// GET /api/admin/users — returns all users with live Fyers balance
// Only callable by admins (middleware redirects non-admins)
export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = (sessionClaims?.metadata as Record<string, unknown>)?.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, clerk_user_id, email, full_name, is_active, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (!users) return NextResponse.json([])

  // Fetch balances in parallel
  const results = await Promise.allSettled(
    users.map(async user => {
      const { data: creds } = await supabaseAdmin
        .from('fyers_credentials')
        .select('client_id, access_token_enc, token_expiry, is_connected')
        .eq('user_id', user.id)
        .single()

      let balance = null
      let connected = false

      if (creds?.is_connected && creds.access_token_enc) {
        const tokenOk = !creds.token_expiry || new Date(creds.token_expiry) > new Date()
        if (tokenOk) {
          try {
            balance = await getFyersFunds(creds.client_id, decrypt(creds.access_token_enc))
            connected = true
          } catch {
            // Balance fetch failed — return null
          }
        }
      }

      return { ...user, balance, connected }
    })
  )

  const data = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...users[i], balance: null, connected: false }
  )

  return NextResponse.json(data)
}

// PATCH /api/admin/users — toggle is_active for a user
export async function PATCH(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = (sessionClaims?.metadata as Record<string, unknown>)?.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, is_active } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ is_active })
    .eq('id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
