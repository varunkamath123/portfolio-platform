import { formatCurrency, formatDate } from '@/lib/utils'
import { TradeRecord } from '@/lib/supabase'

export function TradeTable({ trades }: { trades: TradeRecord[] }) {
  if (!trades.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No trades found.</p>
  }

  const totalPnl       = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const totalCharges   = trades.reduce((s, t) => s + (t.charges ?? 0), 0)
  const totalAfterTax  = trades.reduce((s, t) => s + (t.pnl_after_tax ?? 0), 0)

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCell label="Gross P&L"      value={totalPnl}       />
        <SummaryCell label="Total Charges"  value={-totalCharges}  />
        <SummaryCell label="Net After Tax"  value={totalAfterTax}  bold />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-center">Side</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">P&L</th>
              <th className="px-4 py-3 text-right">Charges</th>
              <th className="px-4 py-3 text-right">Net (Post-Tax)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trades.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{formatDate(t.trade_date)}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.symbol}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium
                    ${t.side === 'BUY' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {t.side}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{t.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(t.price)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium
                  ${(t.pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.pnl != null ? formatCurrency(t.pnl, true) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                  {t.charges != null ? formatCurrency(t.charges) : '—'}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium
                  ${(t.pnl_after_tax ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {t.pnl_after_tax != null ? formatCurrency(t.pnl_after_tax, true) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCell({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`tabular-nums ${bold ? 'text-base font-semibold' : 'text-sm font-medium'}
        ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatCurrency(value, true)}
      </p>
    </div>
  )
}
