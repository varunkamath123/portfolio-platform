import { supabaseAdmin } from '@/lib/supabase'
import { isTokenValid } from '@/lib/kite'
import { UserTable } from '@/components/UserTable'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, clerk_user_id, email, full_name, is_active, is_admin, created_at')
    .order('created_at', { ascending: false })

  const enriched = await Promise.all((users ?? []).map(async u => {
    const [credsResult, qResult] = await Promise.all([
      supabaseAdmin
        .from('kite_credentials')
        .select('is_connected, token_date')
        .eq('user_id', u.id)
        .single(),
      supabaseAdmin
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id),
    ])

    const creds = credsResult.data
    const kite_connected = !!(creds?.is_connected && isTokenValid(creds.token_date))

    return { ...u, kite_connected, question_count: qResult.count ?? 0 }
  }))

  const totalUsers    = enriched.length
  const activeUsers   = enriched.filter(u => u.is_active).length
  const kiteConnected = enriched.filter(u => u.kite_connected).length
  const totalQuestions = enriched.reduce((s, u) => s + (u.question_count ?? 0), 0)

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Users</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',    value: totalUsers,     color: 'white' },
          { label: 'Active',         value: activeUsers,    color: 'var(--green)' },
          { label: 'Kite Connected', value: kiteConnected,  color: '#60a5fa' },
          { label: 'Questions Asked',value: totalQuestions, color: '#f59e0b' },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4" style={cardStyle}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{c.label}</p>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      <UserTable users={enriched} />
    </div>
  )
}
