import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { getFyersFunds } from '@/lib/fyers'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creds = await getUserFyersCreds(userId)
  if ('error' in creds) return NextResponse.json(creds, { status: creds.status })

  try {
    const balance = await getFyersFunds(creds.clientId, creds.accessToken)
    return NextResponse.json(balance)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}

// Shared helper — fetch + decrypt Fyers creds for a Clerk user
export async function getUserFyersCreds(clerkUserId: string) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) return { error: 'User not found', status: 404 as const }

  const { data: creds } = await supabaseAdmin
    .from('fyers_credentials')
    .select('client_id, api_key_enc, access_token_enc, token_expiry, is_connected')
    .eq('user_id', profile.id)
    .single()

  if (!creds || !creds.is_connected || !creds.access_token_enc) {
    return { error: 'Fyers not connected', status: 403 as const }
  }

  if (creds.token_expiry && new Date(creds.token_expiry) < new Date()) {
    return { error: 'Token expired — please reconnect', status: 401 as const }
  }

  return {
    clientId:    creds.client_id,
    accessToken: decrypt(creds.access_token_enc),
    profileId:   profile.id,
  }
}
