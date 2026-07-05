import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { getFyersTradebook } from '@/lib/fyers'
import { calculateCharges, pnlAfterTax } from '@/lib/tax'
import { TradeTable } from '@/components/TradeTable'
import { PnlChart } from '@/components/PnlChart'
import { isFyersTokenValid } from '@/lib/utils'
import { FyersConnectBanner } from '@/components/FyersConnectBanner'
import type { TradeRecord } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function TradesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string }
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: creds } = await supabaseAdmin
    .from('fyers_credentials')
    .select('client_id, access_token_enc, token_expiry, is_connected')
    .eq('user_id', profile.id)
    .single()

  if (!creds) redirect('/onboarding')

  const tokenValid = creds.is_connected && isFyersTokenValid(creds.token_expiry)

  // Try to refresh from Fyers tradebook if token is valid
  if (tokenValid && creds.access_token_enc) {
    const token = decrypt(creds.access_token_enc)
    try {
      const raw = await getFyersTradebook(creds.client_id, token)
      const enriched = raw.map(t => {
        const side    = t.side === 1 ? 'BUY' : 'SELL'
        const charges = calculateCharges(t.trade_value, side, 'OPTIONS')
        return {
          user_id:         profile.id,
          order_id:        t.order_id || t.id,
          trade_date:      t.order_date_time.slice(0, 10),
          symbol:          t.symbol,
          instrument_type: 'OPTIONS',
          side,
          quantity:        t.qty,
          price:           t.trade_price,
          trade_value:     t.trade_value,
          pnl:             null,
          charges:         charges.total,
          pnl_after_tax:   pnlAfterTax(0, charges.total),
          raw_data:        t as unknown as Record<string, unknown>,
        }
      })
      if (enriched.length > 0) {
        await supabaseAdmin
          .from('trade_cache')
          .upsert(enriched, { onConflict: 'user_id,order_id', ignoreDuplicates: false })
      }
    } catch { /* ignore — fall through to cache */ }
  }

  // Load from cache
  let query = supabaseAdmin
    .from('trade_cache')
    .select('*')
    .eq('user_id', profile.id)
    .order('trade_date', { ascending: false })

  if (searchParams.from) query = query.gte('trade_date', searchParams.from)
  if (searchParams.to)   query = query.lte('trade_date', searchParams.to)

  const { data: trades } = await query
  const tradeList = (trades ?? []) as TradeRecord[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Trade History</h1>
        <DateFilter from={searchParams.from} to={searchParams.to} />
      </div>

      {!tokenValid && <FyersConnectBanner expired={creds.is_connected} />}

      <PnlChart trades={tradeList} />
      <TradeTable trades={tradeList} />
    </div>
  )
}

function DateFilter({ from, to }: { from?: string; to?: string }) {
  return (
    <form className="flex items-center gap-2 text-sm">
      <label className="text-gray-500">From</label>
      <input
        type="date"
        name="from"
        defaultValue={from}
        className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <label className="text-gray-500">To</label>
      <input
        type="date"
        name="to"
        defaultValue={to}
        className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-3 py-1 rounded bg-gray-900 text-white text-xs hover:bg-gray-700 transition-colors"
      >
        Filter
      </button>
    </form>
  )
}
