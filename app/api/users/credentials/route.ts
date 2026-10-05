import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { encrypt, decrypt } from '@/lib/encryption'
import { isAdminClaims } from '@/lib/kite'

// Per-user Kite Connect app credentials. A Kite app only accepts logins from
// the Zerodha account that owns it, so each user brings their own api_key/secret.

async function getProfileId(clerkUserId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()
  return data?.id as string | undefined
}

// GET — does this user have their own Kite app saved? (never returns the secret)
export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data } = await supabase
    .from('kite_credentials')
    .select('api_key_enc, api_secret_enc')
    .eq('user_id', profileId)
    .maybeSingle()

  const hasOwn = !!(data?.api_key_enc && data?.api_secret_enc)
  const apiKey = hasOwn ? decrypt(data!.api_key_enc) : null

  return NextResponse.json({
    has_credentials: hasOwn,
    api_key_hint:    apiKey ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-2)}` : null,
    uses_platform_app: !hasOwn && isAdminClaims(sessionClaims),
    redirect_url:    `${process.env.NEXT_PUBLIC_APP_URL}/api/kite/auth/callback`,
  })
}

// POST { api_key, api_secret } — save (or replace) this user's Kite app
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const apiKey    = typeof body.api_key    === 'string' ? body.api_key.trim()    : ''
  const apiSecret = typeof body.api_secret === 'string' ? body.api_secret.trim() : ''

  // Kite keys/secrets are short lowercase alphanumeric strings
  if (!/^[a-z0-9]{8,64}$/i.test(apiKey) || !/^[a-z0-9]{8,64}$/i.test(apiSecret)) {
    return NextResponse.json({ error: 'That doesn\'t look like a valid Kite API key and secret' }, { status: 400 })
  }

  // New app → any existing access token belongs to the old app; force a fresh login
  const { error } = await supabase
    .from('kite_credentials')
    .upsert({
      user_id:          profileId,
      api_key_enc:      encrypt(apiKey),
      api_secret_enc:   encrypt(apiSecret),
      access_token_enc: null,
      token_date:       null,
      is_connected:     false,
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('Save Kite credentials error:', error)
    return NextResponse.json({ error: 'Could not save credentials' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
