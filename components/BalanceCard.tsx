import { formatCurrency } from '@/lib/utils'
import { FyersBalance } from '@/lib/fyers'

export function BalanceCard({ balance }: { balance: FyersBalance }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card label="Total Balance"      value={balance.total_balance} />
      <Card label="Available Margin"   value={balance.available_margin} />
      <Card label="Used Margin"        value={balance.used_margin} highlight />
    </div>
  )
}

function Card({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${highlight ? 'border-amber-200' : 'border-gray-200'}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${highlight ? 'text-amber-600' : 'text-gray-900'}`}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}
