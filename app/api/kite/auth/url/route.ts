import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { buildKiteLoginUrl, getKiteAppCreds, isAdminClaims } from '@/lib/kite'

export async function GET() {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const creds = await getKiteAppCreds(profile.id, isAdminClaims(sessionClaims))
  if (!creds) {
    return NextResponse.json({ error: 'Add your Kite API key and secret first', needs_credentials: true }, { status: 400 })
  }

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/kite/auth/callback`
  const url = buildKiteLoginUrl(creds.apiKey, redirectUrl)

  return NextResponse.json({ url })
}
