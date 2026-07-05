import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { supabaseAdmin } from '@/lib/supabase'

// Clerk webhook → creates user_profile on user.created
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })

  const svixId        = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  const payload = await req.text()

  let event: { type: string; data: Record<string, unknown> }
  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    event = wh.verify(payload, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    const d = event.data
    const email = (d.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address ?? ''
    const firstName = String(d.first_name ?? '')
    const lastName  = String(d.last_name ?? '')

    await supabaseAdmin.from('user_profiles').upsert({
      clerk_user_id: String(d.id),
      email,
      full_name: [firstName, lastName].filter(Boolean).join(' ') || null,
    }, { onConflict: 'clerk_user_id' })
  }

  if (event.type === 'user.deleted') {
    await supabaseAdmin
      .from('user_profiles')
      .update({ is_active: false })
      .eq('clerk_user_id', String(event.data.id))
  }

  return NextResponse.json({ ok: true })
}
