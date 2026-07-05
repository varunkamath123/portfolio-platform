'use client'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { TradeRecord } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

type DaySummary = { date: string; pnl: number; cumPnl: number }

export function PnlChart({ trades }: { trades: TradeRecord[] }) {
  if (!trades.length) return null

  // Group by date, summing pnl_after_tax
  const byDate = new Map<string, number>()
  for (const t of trades) {
    if (!t.trade_date) continue
    byDate.set(t.trade_date, (byDate.get(t.trade_date) ?? 0) + (t.pnl_after_tax ?? 0))
  }

  const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
  let cum = 0
  const data: DaySummary[] = sorted.map(([date, pnl]) => {
    cum += pnl
    return { date, pnl, cumPnl: cum }
  })

  const positive = data[data.length - 1]?.cumPnl >= 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
        Cumulative P&L (post-tax)
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={positive ? '#16a34a' : '#dc2626'} stopOpacity={0.15} />
              <stop offset="95%" stopColor={positive ? '#16a34a' : '#dc2626'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={d => d.slice(5)}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            formatter={(val) => [formatCurrency(Number(val ?? 0), true), 'Cumulative P&L']}
            labelFormatter={l => formatDate(String(l))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="cumPnl"
            stroke={positive ? '#16a34a' : '#dc2626'}
            strokeWidth={2}
            fill="url(#pnlGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
