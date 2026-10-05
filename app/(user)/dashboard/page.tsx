'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Holding = {
  symbol: string; exchange: string; quantity: number
  avg_price: number; ltp: number
  current_value: number; invested_value: number
  pnl: number; pnl_pct: number; day_change_pct: number
}
type Summary = {
  total_invested: number; total_current: number
  total_pnl: number; total_pnl_pct: number; count: number
}

function fmt(n: number) {
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; needs_refresh?: boolean; needs_connect?: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/kite/portfolio')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d); setLoading(false); return }
        setHoldings(d.holdings ?? [])
        setSummary(d.summary)
        setLoading(false)
      })
      .catch(() => { setError({ message: 'Failed to fetch portfolio' }); setLoading(false) })
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Portfolio</h1>
        <Link href="/ask"
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--green)', color: '#000' }}>
          Ask MiroFish →
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl p-8 text-center space-y-4" style={cardStyle}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{error.message}</p>
          {error.needs_connect && (
            <Link href="/onboarding"
              className="inline-block text-sm font-medium px-4 py-2 rounded-lg"
              style={{ background: 'var(--green)', color: '#000' }}>
              Connect Kite account →
            </Link>
          )}
          {error.needs_refresh && (
            <button
              className="text-sm font-medium px-4 py-2 rounded-lg"
              style={{ background: '#b45309', color: '#fff' }}
              onClick={async () => {
                const r = await fetch('/api/kite/auth/url')
                const d = await r.json()
                if (d.url) window.location.href = d.url
              }}>
              Refresh Kite token →
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {([
            ['Invested',  fmt(summary.total_invested),  'text-white'],
            ['Current',   fmt(summary.total_current),   'text-white'],
            ['P&L',       fmt(summary.total_pnl),       summary.total_pnl >= 0 ? 'green' : 'red'],
            ['Return',    pct(summary.total_pnl_pct),   summary.total_pnl_pct >= 0 ? 'green' : 'red'],
          ] as [string, string, string][]).map(([label, val, color]) => (
            <div key={label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
              <p className="text-lg font-bold"
                style={{ color: color === 'green' ? 'var(--green)' : color === 'red' ? '#f87171' : 'white' }}>
                {val}
              </p>
            </div>
          ))}
        </div>
      )}

      {holdings.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-8" style={cardStyle}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs border-b" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Avg</th>
                <th className="text-right px-4 py-3">LTP</th>
                <th className="text-right px-4 py-3">P&amp;L</th>
                <th className="text-right px-4 py-3">Return</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={h.symbol}
                  className={`transition-colors`}
                  style={{
                    borderBottom: i < holdings.length - 1 ? `1px solid var(--border)` : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,199,132,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{h.symbol}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{h.exchange}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-white">{h.quantity}</td>
                  <td className="px-4 py-3 text-right text-white">₹{h.avg_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-white">₹{h.ltp.toFixed(2)}</p>
                    <p className="text-xs" style={{ color: h.day_change_pct >= 0 ? 'var(--green)' : '#f87171' }}>
                      {pct(h.day_change_pct)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium"
                    style={{ color: h.pnl >= 0 ? 'var(--green)' : '#f87171' }}>
                    {fmt(h.pnl)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium"
                    style={{ color: h.pnl_pct >= 0 ? 'var(--green)' : '#f87171' }}>
                    {pct(h.pnl_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Q&amp;As</h2>
          <Link href="/feed" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--green)' }}>
            View all →
          </Link>
        </div>
        <RecentFeed />
      </div>
    </div>
  )
}

function RecentFeed() {
  const [items, setItems] = useState<{ id: string; question: string; tickers: string[] }[]>([])
  useEffect(() => {
    fetch('/api/questions?limit=5')
      .then(r => r.json())
      .then(d => setItems(d.questions ?? []))
      .catch(() => {})
  }, [])

  if (!items.length) return (
    <p className="text-sm" style={{ color: 'var(--muted)' }}>
      No questions yet.{' '}
      <Link href="/ask" className="underline" style={{ color: 'var(--green)' }}>Ask the first one.</Link>
    </p>
  )

  return (
    <div className="space-y-2">
      {items.map(q => (
        <Link key={q.id} href={`/q/${q.id}`}
          className="flex items-center justify-between rounded-lg px-4 py-3 group transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--green-dim)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
        >
          <p className="text-sm text-white">{q.question}</p>
          <div className="flex gap-1 ml-4 flex-shrink-0">
            {q.tickers?.slice(0, 2).map(t => (
              <span key={t} className="text-xs rounded px-2 py-0.5"
                style={{ background: 'rgba(22,199,132,0.1)', color: 'var(--green)' }}>
                {t}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}
