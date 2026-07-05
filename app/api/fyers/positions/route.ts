import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getFyersPositions } from '@/lib/fyers'
import { getUserFyersCreds } from '../balance/route'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creds = await getUserFyersCreds(userId)
  if ('error' in creds) return NextResponse.json(creds, { status: creds.status })

  try {
    const positions = await getFyersPositions(creds.clientId, creds.accessToken)
    return NextResponse.json(positions)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
