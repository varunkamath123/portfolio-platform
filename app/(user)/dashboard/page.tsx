import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { getFyersFunds, getFyersPositions } from '@/lib/fyers'
import { BalanceCard } from '@/components/BalanceCard'
import { FyersConnectBanner } from '@/components/FyersConnectBanner'
import { formatCurrency } from '@/lib/utils'
import { isFyersTokenValid } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { connected?: string }
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Fetch user profile + credentials
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name, email')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: creds } = await supabaseAdmin
    .from('fyers_credentials')
    .select('client_id, access_token_enc, token_expiry, is_connected')
    .eq('user_id', profile.id)
    .single()

  // Not onboarded yet
  if (!creds) redirect('/onboarding')

  const tokenValid = creds.is_connected && isFyersTokenValid(creds.token_expiry)

  let balance  = null
  let positions: Awaited<ReturnType<typeof getFyersPositions>> = []

  if (tokenValid && creds.access_token_enc) {
    const token = decrypt(creds.access_token_enc)
    try {
      ;[balance, positions] = await Promise.all([
        getFyersFunds(creds.client_id, token),
        getFyersPositions(creds.client_id, token),
      ])
    } catch {
      // Token may have been revoked — fall through to re-auth banner
    }
  }

  const todayPnl = positions.reduce((s, p) => s + (p.pnl ?? 0) + (p.realized_profit ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {searchParams.connected === '1' ? 'Fyers connected!' : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500">
          {profile.full_name ?? profile.email}
        </p>
      </div>

      {!tokenValid && <FyersConnectBanner expired={creds.is_connected} />}

      {balance && <BalanceCard balance={balance} />}

      {/* Today P&L */}
      {positions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Today&apos;s P&L</p>
          <p className={`text-3xl font-semibold tabular-nums ${todayPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(todayPnl, true)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{positions.length} open position{positions.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Open Positions</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-50">
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Avg</th>
                <th className="px-4 py-2 text-right">LTP</th>
                <th className="px-4 py-2 text-right">Unrealized</th>
                <th className="px-4 py-2 text-right">Realized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {positions.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{p.symbol}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.qty}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.avg_price)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.ltp)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${p.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(p.pnl, true)}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${p.realized_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(p.realized_profit, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
