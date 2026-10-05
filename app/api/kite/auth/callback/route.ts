import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/encryption'
import { exchangeRequestToken, getKiteAppCreds, isAdminClaims } from '@/lib/kite'

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))

  const requestToken = req.nextUrl.searchParams.get('request_token')
  const status = req.nextUrl.searchParams.get('status')

  if (!requestToken || status !== 'success') {
    return NextResponse.redirect(new URL('/onboarding?error=kite_auth_failed', req.url))
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) throw new Error('Profile not found')

    const creds = await getKiteAppCreds(profile.id, isAdminClaims(sessionClaims))
    if (!creds) throw new Error('No Kite app credentials for user')

    const accessToken = await exchangeRequestToken(creds.apiKey, creds.apiSecret, requestToken)

    await supabase
      .from('kite_credentials')
      .upsert({
        user_id:          profile.id,
        access_token_enc: encrypt(accessToken),
        token_date:       new Date().toISOString(),
        is_connected:     true,
      }, { onConflict: 'user_id' })

    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch (e) {
    console.error('Kite callback error:', e)
    return NextResponse.redirect(new URL('/onboarding?error=token_exchange_failed', req.url))
  }
}
