import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { buildFyersAuthUrl } from '@/lib/fyers'

// GET /api/fyers/auth/url — returns the Fyers OAuth URL for the logged-in user
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: creds } = await supabaseAdmin
    .from('fyers_credentials')
    .select('client_id, api_key_enc')
    .eq('user_id', profile.id)
    .single()

  if (!creds) return NextResponse.json({ error: 'Fyers credentials not configured' }, { status: 400 })

  const appId = decrypt(creds.api_key_enc)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${appUrl}/api/fyers/auth/callback`

  const url = buildFyersAuthUrl(appId, redirectUri, userId)
  return NextResponse.json({ url })
}
