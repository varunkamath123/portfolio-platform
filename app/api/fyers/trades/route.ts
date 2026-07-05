import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getFyersTradebook, FyersTrade } from '@/lib/fyers'
import { calculateCharges, pnlAfterTax } from '@/lib/tax'
import { getUserFyersCreds } from '../balance/route'

// GET /api/fyers/trades?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns trades with charges and estimated tax from Fyers tradebook,
// cached to Supabase trade_cache for historical access.
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creds = await getUserFyersCreds(userId)
  if ('error' in creds) return NextResponse.json(creds, { status: creds.status })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let trades: FyersTrade[]
  try {
    trades = await getFyersTradebook(creds.clientId, creds.accessToken)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  // Filter by date range if provided
  if (from || to) {
    trades = trades.filter(t => {
      const d = t.order_date_time.slice(0, 10)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }

  // Enrich with charges + estimated tax, then upsert to trade_cache
  const enriched = trades.map(t => {
    const side    = t.side === 1 ? 'BUY' : 'SELL'
    const charges = calculateCharges(t.trade_value, side, 'OPTIONS')
    const net     = pnlAfterTax(0, charges.total)  // pnl calculated per matched trade pair; charges always apply
    return {
      user_id:         creds.profileId,
      order_id:        t.order_id || t.id,
      trade_date:      t.order_date_time.slice(0, 10),
      symbol:          t.symbol,
      instrument_type: 'OPTIONS',
      side,
      quantity:        t.qty,
      price:           t.trade_price,
      trade_value:     t.trade_value,
      pnl:             null,        // single-leg; pnl set by pairing logic
      charges:         charges.total,
      pnl_after_tax:   net,
      raw_data:        t as unknown as Record<string, unknown>,
    }
  })

  if (enriched.length > 0) {
    await supabaseAdmin
      .from('trade_cache')
      .upsert(enriched, { onConflict: 'user_id,order_id', ignoreDuplicates: false })
  }

  // Return from cache so historical data beyond tradebook window is included
  let query = supabaseAdmin
    .from('trade_cache')
    .select('*')
    .eq('user_id', creds.profileId)
    .order('trade_date', { ascending: false })

  if (from) query = query.gte('trade_date', from)
  if (to)   query = query.lte('trade_date', to)

  const { data } = await query
  return NextResponse.json(data ?? [])
}
