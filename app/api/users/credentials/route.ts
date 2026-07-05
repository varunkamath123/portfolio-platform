import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encrypt } from '@/lib/encryption'

// POST /api/users/credentials — save Fyers API key + secret for the logged-in user
// Called during onboarding. Credentials are AES-256 encrypted before storage.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id, api_key, secret_key } = await req.json()
  if (!client_id || !api_key || !secret_key) {
    return NextResponse.json({ error: 'client_id, api_key and secret_key are required' }, { status: 400 })
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('fyers_credentials')
    .upsert({
      user_id:       profile.id,
      client_id,
      api_key_enc:   encrypt(api_key),
      secret_key_enc: encrypt(secret_key),
      is_connected:  false,
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
