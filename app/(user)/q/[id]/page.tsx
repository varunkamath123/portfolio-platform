'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'

type AgentScore = { agent: string; score: number; reasoning: string }
type MiroFish = {
  symbol: string
  composite: number
  verdict: string
  bull_case: string[]
  bear_case: string[]
  entry: number | null
  stop: number | null
  target1: number | null
  rr: number | null
  agents: AgentScore[]
  screener: { pe: number; roe: number; roce: number; pat_cagr_5y: number; live_price: number }
  peg_5y: number | null
}
type Question = {
  id: string
  question: string
  tickers: string[]
  created_at: string
  user_profiles: { full_name: string }
  answers: { answer_md: string; mirofish_data: MiroFish[]; created_at: string }[]
}

const AGENT_COLORS: Record<string, string> = {
  GRAHAM:  '#f59e0b',
  BUFFETT: 'var(--green)',
  PABRAI:  '#60a5fa',
  GARP:    '#a78bfa',
  MACRO:   '#22d3ee',
  DEVIL:   '#f87171',
}

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

function ScoreBar({ score }: { score: number }) {
  const filled = Math.round(score)
  return (
    <span className="font-mono text-xs" style={{ color: 'var(--green)' }}>
      {'█'.repeat(filled)}<span style={{ color: 'var(--border)' }}>{'░'.repeat(10 - filled)}</span>
      <span className="text-white ml-1">{score}/10</span>
    </span>
  )
}

function MiroFishCard({ data }: { data: MiroFish }) {
  const composite = data.composite
  const verdictColor = composite >= 7 ? 'var(--green)' : composite >= 5 ? '#f59e0b' : '#f87171'
  const verdictBg   = composite >= 7 ? 'rgba(22,199,132,0.1)' : composite >= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(248,113,113,0.1)'

  return (
    <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-lg font-bold text-white">{data.symbol}</span>
          <span className="ml-3 text-sm" style={{ color: 'var(--muted)' }}>Composite {composite}/10</span>
        </div>
        <span className="text-sm font-medium px-2 py-1 rounded-md"
          style={{ color: verdictColor, background: verdictBg }}>
          {data.verdict?.split('—')[0]?.trim() ?? 'HOLD'}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {([
          ['PE',      data.screener?.pe      != null ? `${data.screener.pe}x`       : '—'],
          ['ROE',     data.screener?.roe     != null ? `${data.screener.roe}%`      : '—'],
          ['ROCE',    data.screener?.roce    != null ? `${data.screener.roce}%`     : '—'],
          ['5Y CAGR', data.screener?.pat_cagr_5y != null ? `${data.screener.pat_cagr_5y}%` : '—'],
          ['PEG',     data.peg_5y != null   ? String(data.peg_5y)                  : '—'],
          ['CMP',     data.screener?.live_price ? `₹${data.screener.live_price}`   : '—'],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} className="rounded-lg px-3 py-2" style={{ background: 'rgba(22,199,132,0.05)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-white font-medium">{val}</p>
          </div>
        ))}
      </div>

      {/* Agent scores */}
      <div className="space-y-2">
        {data.agents?.map(a => (
          <div key={a.agent} className="flex items-center gap-3 text-xs">
            <span className="w-16 font-mono font-bold" style={{ color: AGENT_COLORS[a.agent] ?? 'white' }}>
              {a.agent}
            </span>
            <ScoreBar score={a.score} />
            <span className="flex-1 truncate" style={{ color: 'var(--muted)' }}>{a.reasoning}</span>
          </div>
        ))}
      </div>

      {/* Bull / Bear */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-medium mb-1" style={{ color: 'var(--green)' }}>Bull case</p>
          {data.bull_case?.map((b, i) => (
            <p key={i} className="mb-0.5" style={{ color: 'var(--muted)' }}>+ {b}</p>
          ))}
        </div>
        <div>
          <p className="font-medium mb-1 text-red-400">Bear case</p>
          {data.bear_case?.map((b, i) => (
            <p key={i} className="mb-0.5" style={{ color: 'var(--muted)' }}>− {b}</p>
          ))}
        </div>
      </div>

      {/* Trade setup */}
      {data.entry && (
        <div className="flex gap-4 text-xs pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>Entry <strong className="text-white">₹{data.entry}</strong></span>
          {data.stop   && <span style={{ color: 'var(--muted)' }}>Stop <strong className="text-red-400">₹{data.stop}</strong></span>}
          {data.target1 && <span style={{ color: 'var(--muted)' }}>T1 <strong style={{ color: 'var(--green)' }}>₹{data.target1}</strong></span>}
          {data.rr     && <span style={{ color: 'var(--muted)' }}>R:R <strong className="text-white">{data.rr}x</strong></span>}
        </div>
      )}
    </div>
  )
}

export default function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted)' }}>
      Loading analysis…
    </div>
  )
  if (!data) return (
    <div className="text-center mt-20" style={{ color: 'var(--muted)' }}>
      Question not found.{' '}
      <Link href="/feed" style={{ color: 'var(--green)' }} className="underline">Back to feed</Link>
    </div>
  )

  const answer = data.answers?.[0]
  const mirofish: MiroFish[] = answer?.mirofish_data ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-20 space-y-8">
      {/* Question */}
      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
          {data.user_profiles?.full_name ?? 'Member'} ·{' '}
          {new Date(data.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <h1 className="text-xl font-semibold text-white">{data.question}</h1>
        {data.tickers?.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {data.tickers.map(t => (
              <span key={t} className="text-xs rounded px-2 py-0.5"
                style={{ background: 'rgba(22,199,132,0.1)', color: 'var(--green)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MiroFish analysis cards */}
      {mirofish.length > 0 && (
        <div className="space-y-4">
          {mirofish.map(m => <MiroFishCard key={m.symbol} data={m} />)}
        </div>
      )}

      {/* Full answer */}
      {answer?.answer_md && (
        <div className="rounded-xl p-6" style={cardStyle}>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(answer.answer_md) }} />
        </div>
      )}

      <Link href="/feed" className="block text-sm" style={{ color: 'var(--muted)' }}>
        ← Back to feed
      </Link>
    </div>
  )
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:white;font-weight:600;margin-top:1rem;margin-bottom:0.25rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:white;font-weight:700;margin-top:1.25rem;margin-bottom:0.5rem;font-size:1rem">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:white;font-weight:700;margin-top:1.5rem;margin-bottom:0.5rem">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#1a2a1a;border-radius:3px;padding:0 4px;color:var(--green);font-size:0.75rem">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:1rem;color:#a0b8a0">$1</li>')
    .replace(/\n\n/g, '</p><p style="color:#a0b8a0;font-size:0.875rem;margin-bottom:0.75rem">')
    .replace(/^/, '<p style="color:#a0b8a0;font-size:0.875rem;margin-bottom:0.75rem">')
    .replace(/$/, '</p>')
}
