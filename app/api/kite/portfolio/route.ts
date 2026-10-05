import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { getKiteHoldings, isTokenValid } from '@/lib/kite'
import { fetchScreenerData } from '@/lib/screener'

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

  if (!creds || !creds.is_connected) {
    return NextResponse.json({ error: 'Kite not connected', needs_connect: true }, { status: 400 })
  }

  if (!isTokenValid(creds.token_date)) {
    return NextResponse.json({ error: 'Kite token expired — please reconnect', needs_refresh: true }, { status: 401 })
  }

  const apiKey = process.env.KITE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'KITE_API_KEY not configured' }, { status: 500 })

  const accessToken = decrypt(creds.access_token_enc)
  const holdings = await getKiteHoldings(apiKey, accessToken)

  // Enrich with sector + market cap category from Screener (parallel, timeout-guarded)
  const screenerResults = await Promise.allSettled(
    holdings.slice(0, 20).map(h =>
      Promise.race([
        fetchScreenerData(h.tradingsymbol),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]).catch(() => null)
    )
  )

  const enriched = holdings.map((h, i) => {
    const sr = screenerResults[i]?.status === 'fulfilled' ? screenerResults[i].value : null

    return {
      symbol:               h.tradingsymbol,
      exchange:             h.exchange,
      quantity:             h.quantity,
      avg_price:            h.average_price,
      ltp:                  h.last_price,
      current_value:        h.quantity * h.last_price,
      invested_value:       h.quantity * h.average_price,
      pnl:                  h.pnl,
      pnl_pct:              h.average_price > 0 ? ((h.last_price / h.average_price - 1) * 100) : 0,
      day_change_pct:       h.day_change_percentage,
      sector:               sr?.sector ?? null,
      market_cap_category:  sr?.market_cap_category ?? 'Unknown',
      market_cap_cr:        sr?.market_cap_cr ?? null,
      pe:                   sr?.pe ?? null,
      roe:                  sr?.roe ?? null,
      pat_cagr_5y:          sr?.pat_cagr_5y ?? null,
    }
  })

  const total_invested = enriched.reduce((s, h) => s + h.invested_value, 0)
  const total_current  = enriched.reduce((s, h) => s + h.current_value, 0)
  const total_pnl      = total_current - total_invested

  return NextResponse.json({
    holdings: enriched,
    summary: {
      total_invested,
      total_current,
      total_pnl,
      total_pnl_pct: total_invested > 0 ? (total_pnl / total_invested * 100) : 0,
      count: enriched.length,
    },
  })
}
