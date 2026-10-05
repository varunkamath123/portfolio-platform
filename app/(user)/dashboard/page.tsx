'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Holding = {
  symbol: string; exchange: string; quantity: number
  avg_price: number; ltp: number
  current_value: number; invested_value: number
  pnl: number; pnl_pct: number; day_change_pct: number
  sector: string | null
  market_cap_category: 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Precious Metals' | 'ETF' | 'Unknown'
}
type Summary = {
  total_invested: number; total_current: number
  total_pnl: number; total_pnl_pct: number; count: number
}
type HealthData = {
  health_score: number
  summary: string
  sector_concentration: { sector: string; allocation_pct: number }[]
  growth_outlook: string
  risks: string[]
  opportunities: string[]
}

function fmt(n: number) {
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
function pct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` }

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

function CapBadge({ cat }: { cat: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    'Large Cap':       { bg: 'rgba(22,199,132,0.12)', color: 'var(--green)' },
    'Mid Cap':         { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    'Small Cap':       { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
    'Precious Metals': { bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
    'ETF':             { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
    'Unknown':         { bg: 'rgba(107,143,107,0.12)', color: 'var(--muted)' },
  }
  const style = colors[cat] ?? colors['Unknown']
  return (
    <span className="text-xs rounded px-1.5 py-0.5 font-medium" style={{ ...style, whiteSpace: 'nowrap' }}>
      {cat === 'Unknown' ? '—' : cat}
    </span>
  )
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--green)' : score >= 50 ? '#f59e0b' : '#f87171'
  const label = score >= 70 ? 'Healthy' : score >= 50 ? 'Moderate' : 'Needs Review'
  const r = 42, circ = 2 * Math.PI * r
  const dash = circ * (score / 100)
  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)" />
        <text x="50" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{score}</text>
        <text x="50" y="64" textAnchor="middle" fill="var(--muted)" fontSize="8">/100</text>
      </svg>
      <div>
        <p className="font-bold text-white">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Portfolio Health Score</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; needs_refresh?: boolean; needs_connect?: boolean } | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  useEffect(() => {
    fetch('/api/kite/portfolio')
      .then(r => r.json())
      .then(d => {
        if (d.needs_connect) { window.location.href = '/onboarding'; return }
        if (d.error) { setError(d); setLoading(false); return }
        setHoldings(d.holdings ?? [])
        setSummary(d.summary)
        setLoading(false)
        // Kick off health analysis — POST the already-fetched holdings to avoid re-fetching
        if ((d.holdings ?? []).length > 0) {
          setHealthLoading(true)
          fetch('/api/portfolio/health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holdings: d.holdings }),
          })
            .then(r => r.json())
            .then(h => { setHealth(h); setHealthLoading(false) })
            .catch(() => setHealthLoading(false))
        }
      })
      .catch(() => { window.location.href = '/onboarding' })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Portfolio</h1>
        <Link href="/ask"
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--green)', color: '#000' }}>
          Research →
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
        <div className="rounded-xl overflow-x-auto mb-8" style={cardStyle}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs border-b" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-left px-4 py-3">Sector</th>
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
                  style={{
                    borderBottom: i < holdings.length - 1 ? `1px solid var(--border)` : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,199,132,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{h.symbol}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CapBadge cat={h.market_cap_category} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {h.sector ?? <span style={{ color: 'var(--border)' }}>—</span>}
                    </p>
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

      {/* ── Portfolio Health ── */}
      {(healthLoading || health) && (
        <div className="mb-8">
          <h2 className="font-semibold text-white mb-4">Portfolio Health</h2>
          {healthLoading && !health && (
            <div className="rounded-xl p-6" style={cardStyle}>
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5" style={{ color: 'var(--green)' }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Analysing portfolio health…
                </p>
              </div>
            </div>
          )}
          {health && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Score + summary */}
              <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
                <HealthGauge score={health.health_score} />
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{health.summary}</p>
              </div>

              {/* Growth outlook */}
              <div className="rounded-xl p-5" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green)' }}>
                  2–3 Quarter Outlook
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{health.growth_outlook}</p>

                {health.opportunities?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--green)' }}>Opportunities</p>
                    {health.opportunities.map((o, i) => (
                      <p key={i} className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>+ {o}</p>
                    ))}
                  </div>
                )}

                {health.risks?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-1 text-red-400">Risks</p>
                    {health.risks.map((r, i) => (
                      <p key={i} className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>− {r}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Sector concentration */}
              {health.sector_concentration?.length > 0 && (
                <div className="rounded-xl p-5 md:col-span-2" style={cardStyle}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                    Sector Allocation
                  </p>
                  <div className="space-y-2">
                    {health.sector_concentration.map(sc => (
                      <div key={sc.sector} className="flex items-center gap-3">
                        <span className="text-xs w-32 truncate" style={{ color: 'var(--muted)' }}>{sc.sector}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                          <div className="h-1.5 rounded-full" style={{
                            width: `${Math.min(sc.allocation_pct, 100)}%`,
                            background: sc.allocation_pct > 30 ? '#f59e0b' : 'var(--green)',
                          }} />
                        </div>
                        <span className="text-xs w-10 text-right" style={{
                          color: sc.allocation_pct > 30 ? '#f59e0b' : 'white',
                        }}>
                          {sc.allocation_pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Recent Research ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Research</h2>
          <Link href="/ask" className="text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--green)' }}>
            New research →
          </Link>
        </div>
        <RecentFeed />
      </div>
    </div>
  )
}

function RecentFeed() {
  const [items, setItems] = useState<{ id: string; question: string; tickers: string[]; created_at: string }[]>([])
  useEffect(() => {
    fetch('/api/questions?limit=5')
      .then(r => r.json())
      .then(d => setItems(d.questions ?? []))
      .catch(() => {})
  }, [])

  if (!items.length) return (
    <p className="text-sm" style={{ color: 'var(--muted)' }}>
      No research yet.{' '}
      <Link href="/ask" className="underline" style={{ color: 'var(--green)' }}>Start researching.</Link>
    </p>
  )

  return (
    <div className="space-y-2">
      {items.map(q => (
        <Link key={q.id} href={`/ask?id=${q.id}`}
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
