'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Question = {
  id: string
  question: string
  tickers: string[]
  created_at: string
  user_profiles: { full_name: string }
  answers: { answer_md: string }[]
}

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/questions?limit=30')
      .then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Community Q&amp;A</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>MiroFish answers to everyone&apos;s questions</p>
        </div>
        <Link
          href="/ask"
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--green)', color: '#000' }}
        >
          Ask →
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-5 animate-pulse h-24" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
          No questions yet.{' '}
          <Link href="/ask" className="underline" style={{ color: 'var(--green)' }}>Be the first to ask.</Link>
        </div>
      )}

      <div className="space-y-3">
        {questions.map(q => (
          <Link
            key={q.id}
            href={`/q/${q.id}`}
            className="block rounded-xl p-5 transition-all"
            style={cardStyle}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--green-dim)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
          >
            <p className="text-white font-medium">{q.question}</p>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {q.tickers?.map(t => (
                <span key={t} className="text-xs rounded px-2 py-0.5"
                  style={{ background: 'rgba(22,199,132,0.1)', color: 'var(--green)' }}>
                  {t}
                </span>
              ))}
              <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                {q.user_profiles?.full_name ?? 'Member'} ·{' '}
                {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {q.answers?.[0]?.answer_md && (
              <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>
                {q.answers[0].answer_md.replace(/[#*`]/g, '').slice(0, 180)}…
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
