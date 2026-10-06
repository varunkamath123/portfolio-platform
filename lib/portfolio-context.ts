// Plain-text portfolio summary sent with every research question.
// Weights and sector totals are computed here so the model never has to do
// allocation arithmetic itself (it gets it wrong — eval Oct 2026: sector
// weights summing to 124%). Pure function: safe for client and server.

export type ContextHolding = {
  symbol: string
  sector: string | null
  market_cap_category: string
  quantity: number
  avg_price: number
  ltp: number
  pnl_pct: number
  current_value: number
  pe?: number | null
  roe?: number | null
  pat_cagr_5y?: number | null
}

export type ContextSummary = { total_invested: number; total_current: number; total_pnl_pct: number }

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

// PE / ROE / 5Y PAT CAGR from Screener, when the portfolio API has them
function fundamentals(h: ContextHolding): string {
  const parts = [
    h.pe != null && `PE ${h.pe}x`,
    h.roe != null && `ROE ${h.roe}%`,
    h.pat_cagr_5y != null && `5Y PAT CAGR ${h.pat_cagr_5y}%`,
  ].filter(Boolean)
  return parts.length ? ` | ${parts.join(' | ')}` : ''
}

export function buildPortfolioContext(holdings: ContextHolding[], summary: ContextSummary | null): string {
  if (!holdings.length) return ''
  const total = holdings.reduce((s, h) => s + h.current_value, 0) || 1

  const rows = [...holdings]
    .sort((a, b) => b.current_value - a.current_value)
    .map(h =>
      `${h.symbol} | ${h.sector ?? 'Unknown'} | ${h.market_cap_category} | Qty ${h.quantity} | Avg ₹${h.avg_price.toFixed(0)} | LTP ₹${h.ltp.toFixed(0)} | Value ${rupees(h.current_value)} | Weight ${(h.current_value / total * 100).toFixed(1)}% | P&L ${pct(h.pnl_pct)}${fundamentals(h)}`
    )

  const bySector = new Map<string, number>()
  for (const h of holdings) {
    const k = h.sector ?? 'Unknown'
    bySector.set(k, (bySector.get(k) ?? 0) + h.current_value)
  }
  const sectors = [...bySector.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s, v]) => `${s} ${(v / total * 100).toFixed(1)}%`)
    .join(' | ')

  const totals = summary
    ? `Total value: ${rupees(summary.total_current)} | Invested: ${rupees(summary.total_invested)} | Overall return: ${pct(summary.total_pnl_pct)}`
    : `Total value: ${rupees(total)}`

  return [
    'Holdings (largest first):',
    ...rows,
    `Sector weights (pre-computed, sum to 100%): ${sectors}`,
    totals,
  ].join('\n')
}
