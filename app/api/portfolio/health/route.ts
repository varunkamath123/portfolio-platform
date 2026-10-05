import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { getKiteHoldings, isTokenValid } from '@/lib/kite'
import { fetchScreenerData } from '@/lib/screener'
import { generatePortfolioHealth } from '@/lib/mirofish'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: creds } = await supabase
    .from('kite_credentials')
    .select('access_token_enc, token_date, is_connected')
    .eq('user_id', profile.id)
    .single()

  if (!creds?.is_connected || !isTokenValid(creds.token_date)) {
    return NextResponse.json({ error: 'Kite not connected' }, { status: 400 })
  }

  const apiKey = process.env.KITE_API_KEY!
  const accessToken = decrypt(creds.access_token_enc)
  const holdings = await getKiteHoldings(apiKey, accessToken)

  if (!holdings.length) {
    return NextResponse.json({ error: 'No holdings found' }, { status: 404 })
  }

  // Fetch screener data for all holdings (parallel, 8s timeout each)
  const screenerResults = await Promise.allSettled(
    holdings.slice(0, 15).map(h =>
      Promise.race([
        fetchScreenerData(h.tradingsymbol),
        new Promise<null>((_, reject) => setTimeout(() => reject(), 8000)),
      ]).catch(() => null)
    )
  )

  const enriched = holdings.slice(0, 15).map((h, i) => {
    const sr = screenerResults[i]?.status === 'fulfilled' ? screenerResults[i].value : null
    return {
      symbol:               h.tradingsymbol,
      sector:               sr?.sector ?? null,
      market_cap_category:  sr?.market_cap_category ?? 'Unknown',
      pnl_pct:              h.average_price > 0 ? ((h.last_price / h.average_price - 1) * 100) : 0,
      current_value:        h.quantity * h.last_price,
      pat_cagr_5y:          sr?.pat_cagr_5y ?? null,
      pe:                   sr?.pe ?? null,
      roe:                  sr?.roe ?? null,
    }
  })

  const health = await generatePortfolioHealth(enriched)
  return NextResponse.json(health)
}
