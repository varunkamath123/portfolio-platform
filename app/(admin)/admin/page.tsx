import { supabaseAdmin } from '@/lib/supabase'
import { getFyersFunds } from '@/lib/fyers'
import { decrypt } from '@/lib/encryption'
import { UserTable } from '@/components/UserTable'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, clerk_user_id, email, full_name, is_active, is_admin, created_at')
    .order('created_at', { ascending: false })

  const enriched = await Promise.all(
    (users ?? []).map(async u => {
      const { data: creds } = await supabaseAdmin
        .from('fyers_credentials')
        .select('client_id, access_token_enc, token_expiry, is_connected')
        .eq('user_id', u.id)
        .single()

      let balance = null
      let connected = false

      if (creds?.is_connected && creds.access_token_enc) {
        const tokenOk = !creds.token_expiry || new Date(creds.token_expiry) > new Date()
        if (tokenOk) {
          try {
            balance = await getFyersFunds(creds.client_id, decrypt(creds.access_token_enc))
            connected = true
          } catch { /* ignore */ }
        }
      }

      return { ...u, balance, connected }
    })
  )

  // Totals across all connected users
  const totalBalance   = enriched.reduce((s, u) => s + (u.balance?.total_balance ?? 0), 0)
  const totalAvailable = enriched.reduce((s, u) => s + (u.balance?.available_margin ?? 0), 0)
  const totalMarginUsed = enriched.reduce((s, u) => s + (u.balance?.used_margin ?? 0), 0)
  const connectedCount = enriched.filter(u => u.connected).length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Admin — All Users</h1>

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: String(enriched.length),    mono: false },
          { label: 'Connected',     value: String(connectedCount),      mono: false },
          { label: 'Total AUM',     value: formatCurrency(totalBalance), mono: true },
          { label: 'Margin Used',   value: formatCurrency(totalMarginUsed), mono: true },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-xl font-semibold ${c.mono ? 'tabular-nums' : ''} text-gray-900`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <UserTable users={enriched} />
    </div>
  )
}
