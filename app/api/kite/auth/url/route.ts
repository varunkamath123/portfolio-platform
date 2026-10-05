import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { buildKiteLoginUrl } from '@/lib/kite'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.KITE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'KITE_API_KEY not configured' }, { status: 500 })

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/kite/auth/callback`
  const url = buildKiteLoginUrl(apiKey, redirectUrl)

  return NextResponse.json({ url })
}
