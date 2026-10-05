'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EXAMPLES = [
  'What is your read on Muthoot Finance for the long term?',
  'Compare HDFC Bank vs Shriram Finance for a 3 year hold',
  'Is BSE Ltd a buy at current levels?',
  'Should I add more to GRSE or book profits?',
]

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

export default function AskPage() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim() }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    const data = await res.json()
    router.push(`/q/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 pb-20">
      <h1 className="text-2xl font-bold text-white mb-1">Ask about any stock</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
        MiroFish runs a 6-agent analysis (Graham, Buffett, Pabrai, GARP, Macro, Devil&apos;s Advocate)
        using live Screener.in data. Answers are visible to everyone on this platform.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <textarea
          className="w-full rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none min-h-[120px]"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            ...(typeof window !== 'undefined' ? {} : {}),
          }}
          placeholder="Ask anything about Indian stocks…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={loading}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="w-full font-semibold py-2.5 rounded-xl text-sm transition-opacity disabled:opacity-40"
          style={{ background: 'var(--green)', color: '#000' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Running MiroFish… (15–30s)
            </span>
          ) : 'Ask MiroFish →'}
        </button>
      </form>

      <div className="mt-10">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Try asking</p>
        <div className="space-y-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setQuestion(ex)}
              className="w-full text-left text-sm rounded-lg px-4 py-2.5 transition-all"
              style={cardStyle}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--green-dim)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
            >
              <span style={{ color: 'var(--muted)' }}>{ex}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
