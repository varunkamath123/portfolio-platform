import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt, encrypt } from '@/lib/encryption'
import { exchangeAuthCode } from '@/lib/fyers'

// GET /api/fyers/auth/callback?code=...&state=<clerkUserId>
// Fyers redirects here after OAuth; we exchange the code for an access token and store it.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code   = searchParams.get('code')
  const userId = searchParams.get('state')   // clerk_user_id passed as state

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/connect-fyers?error=missing_params', req.url))
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/connect-fyers?error=user_not_found', req.url))
  }

  const { data: creds } = await supabaseAdmin
    .from('fyers_credentials')
    .select('client_id, api_key_enc, secret_key_enc')
    .eq('user_id', profile.id)
    .single()

  if (!creds) {
    return NextResponse.redirect(new URL('/connect-fyers?error=no_credentials', req.url))
  }

  try {
    const appId     = decrypt(creds.api_key_enc)
    const secretKey = decrypt(creds.secret_key_enc)
    const token     = await exchangeAuthCode(appId, secretKey, code)

    // Token expires at midnight IST (next calendar day at 18:30 UTC)
    const now     = new Date()
    const expiry  = new Date()
    expiry.setUTCHours(18, 30, 0, 0)
    if (expiry <= now) expiry.setUTCDate(expiry.getUTCDate() + 1)

    await supabaseAdmin
      .from('fyers_credentials')
      .update({
        access_token_enc: encrypt(token),
        token_expiry:     expiry.toISOString(),
        is_connected:     true,
      })
      .eq('user_id', profile.id)

    return NextResponse.redirect(new URL('/dashboard?connected=1', req.url))
  } catch (err) {
    console.error('[fyers/auth/callback]', err)
    return NextResponse.redirect(new URL('/connect-fyers?error=token_exchange', req.url))
  }
}
