'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
type Conversation = {
  id: string
  question: string
  tickers: string[]
  status: string
  created_at: string
}
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: { mirofish?: MiroFishResult[] } | null
  created_at: string
}
type AgentScore = { agent: string; score: number; reasoning: string }
type MiroFishResult = {
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
  screener: { pe: number | null; roe: number | null; roce: number | null; pat_cagr_5y: number | null; live_price?: number; market_cap_category?: string; sector?: string }
  peg_5y: number | null
  live_price: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AGENT_COLORS: Record<string, string> = {
  GRAHAM: '#f59e0b', BUFFETT: 'var(--green)', PABRAI: '#60a5fa',
  GARP: '#a78bfa', MACRO: '#22d3ee', DEVIL: '#f87171',
}
const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:white;font-weight:600;margin-top:1rem;margin-bottom:0.25rem;font-size:0.9rem">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="color:white;font-weight:700;margin-top:1.25rem;margin-bottom:0.5rem">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="color:white;font-weight:700;margin-top:1.5rem;margin-bottom:0.5rem">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#1a2a1a;border-radius:3px;padding:0 4px;color:var(--green);font-size:0.75rem">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:1rem;color:#a0b8a0;margin-bottom:2px">$1</li>')
    .replace(/\n\n/g, '</p><p style="color:#a0b8a0;font-size:0.875rem;margin-bottom:0.75rem">')
    .replace(/^/, '<p style="color:#a0b8a0;font-size:0.875rem;margin-bottom:0.75rem">')
    .replace(/$/, '</p>')
}

// ─── Analysis card ─────────────────────────────────────────────────────────
function AnalysisCard({ data }: { data: MiroFishResult }) {
  const c = data.composite
  const vCol = c >= 7 ? 'var(--green)' : c >= 5 ? '#f59e0b' : '#f87171'
  const vBg  = c >= 7 ? 'rgba(22,199,132,0.1)' : c >= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(248,113,113,0.1)'
  const cmp = data.live_price ?? data.screener?.live_price ?? null

  return (
    <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-bold text-white">{data.symbol}</span>
          {data.screener?.sector && (
            <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>{data.screener.sector}</span>
          )}
          <span className="ml-2 text-sm" style={{ color: 'var(--muted)' }}>· {c}/10</span>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-md"
          style={{ color: vCol, background: vBg }}>
          {data.verdict?.split('—')[0]?.trim() ?? 'HOLD'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {([
          ['PE',      data.screener?.pe      != null ? `${data.screener.pe}x`          : '—'],
          ['ROE',     data.screener?.roe     != null ? `${data.screener.roe}%`         : '—'],
          ['5Y CAGR', data.screener?.pat_cagr_5y != null ? `${data.screener.pat_cagr_5y}%` : '—'],
          ['PEG',     data.peg_5y != null           ? String(data.peg_5y)              : '—'],
          ['CMP',     cmp                           ? `₹${cmp}`                        : '—'],
          ['Cap',     data.screener?.market_cap_category ?? '—'],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} className="rounded px-2 py-1.5" style={{ background: 'rgba(22,199,132,0.05)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-white font-medium">{val}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {data.agents?.map(a => (
          <div key={a.agent} className="flex items-center gap-2 text-xs">
            <span className="w-14 font-mono font-bold" style={{ color: AGENT_COLORS[a.agent] ?? 'white' }}>{a.agent}</span>
            <span className="font-mono" style={{ color: 'var(--green)' }}>
              {'█'.repeat(Math.round(a.score))}<span style={{ color: 'var(--border)' }}>{'░'.repeat(10 - Math.round(a.score))}</span>
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{a.score}/10</span>
            <span className="flex-1 truncate text-xs" style={{ color: 'var(--muted)' }}>{a.reasoning}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="font-medium mb-1" style={{ color: 'var(--green)' }}>Bull case</p>
          {data.bull_case?.map((b, i) => <p key={i} className="mb-0.5" style={{ color: 'var(--muted)' }}>+ {b}</p>)}
        </div>
        <div>
          <p className="font-medium mb-1 text-red-400">Bear case</p>
          {data.bear_case?.map((b, i) => <p key={i} className="mb-0.5" style={{ color: 'var(--muted)' }}>− {b}</p>)}
        </div>
      </div>

      {data.entry && (
        <div className="flex gap-4 text-xs pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>Entry <strong className="text-white">₹{data.entry}</strong></span>
          {data.stop    && <span style={{ color: 'var(--muted)' }}>Stop <strong className="text-red-400">₹{data.stop}</strong></span>}
          {data.target1 && <span style={{ color: 'var(--muted)' }}>T1 <strong style={{ color: 'var(--green)' }}>₹{data.target1}</strong></span>}
          {data.rr      && <span style={{ color: 'var(--muted)' }}>R:R <strong className="text-white">{data.rr}x</strong></span>}
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const mirofish: MiroFishResult[] = msg.metadata?.mirofish ?? []

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white"
          style={{ background: 'rgba(22,199,132,0.18)', border: '1px solid rgba(22,199,132,0.3)' }}>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--green)', color: '#000' }}>A</div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Analysis</span>
      </div>

      {mirofish.length > 0 && (
        <div className="space-y-3">
          {mirofish.map(m => <AnalysisCard key={m.symbol} data={m} />)}
        </div>
      )}

      <div className="text-sm rounded-xl p-4" style={cardStyle}
        dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ label }: { label: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--green)' }}>
          <svg className="animate-spin w-3 h-3 text-black" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      </div>
    </div>
  )
}

// ─── Examples ────────────────────────────────────────────────────────────────
const EXAMPLES = [
  'What is your read on Muthoot Finance for the long term?',
  'Compare HDFC Bank vs Shriram Finance for a 3 year hold',
  'Is BSE Ltd a buy at current levels?',
  'Should I add more to GRSE or book profits?',
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCompose, setIsCompose] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)

  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const followUpRef = useRef<HTMLTextAreaElement>(null)

  // Load conversation list
  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/questions?limit=50')
    if (!res.ok) return
    const d = await res.json()
    setConversations(d.questions ?? [])
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Auto-select from URL param
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) { setActiveId(id); setIsCompose(false) }
    else if (conversations.length === 0) { setIsCompose(true) }
  }, [searchParams, conversations.length])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) return
    setMsgLoading(true)
    setMessages([])
    fetch(`/api/questions/${activeId}/messages`)
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []); setMsgLoading(false) })
      .catch(() => setMsgLoading(false))
  }, [activeId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectConversation(id: string) {
    setActiveId(id)
    setIsCompose(false)
    setSidebarOpen(false)
    router.replace(`/ask?id=${id}`)
  }

  function startNew() {
    setActiveId(null)
    setIsCompose(true)
    setMessages([])
    setDraft('')
    setSubmitError('')
    setSidebarOpen(false)
    router.replace('/ask')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: draft.trim() }),
    })

    if (!res.ok) {
      const d = await res.json()
      setSubmitError(d.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }

    const d = await res.json()
    await loadConversations()
    setActiveId(d.id)
    setIsCompose(false)
    router.replace(`/ask?id=${d.id}`)
    setSubmitting(false)
    setDraft('')
  }

  async function submitFollowUp(e: React.FormEvent) {
    e.preventDefault()
    if (!followUp.trim() || !activeId) return
    setFollowUpLoading(true)

    const res = await fetch(`/api/questions/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: followUp.trim() }),
    })

    setFollowUp('')
    if (!res.ok) { setFollowUpLoading(false); return }

    const d = await res.json()
    setMessages(prev => [...prev, d.userMessage, d.aiMessage])
    setFollowUpLoading(false)
  }

  const activeConversation = conversations.find(c => c.id === activeId)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left sidebar ── */}
      <aside
        className={`
          fixed md:static z-30 md:z-auto top-14 bottom-0 left-0
          flex flex-col transition-transform duration-200
          md:translate-x-0
        `}
        style={{
          width: 260,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          ...(typeof window !== 'undefined' && window.innerWidth < 768 && !sidebarOpen
            ? { transform: 'translateX(-100%)' }
            : {}),
        }}
      >
        <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={startNew}
            className="w-full flex items-center gap-2 text-sm font-semibold rounded-lg px-3 py-2.5 transition-opacity hover:opacity-80"
            style={{ background: 'var(--green)', color: '#000' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Research
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-xs px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>
              No research yet. Start one above.
            </p>
          )}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className="w-full text-left px-4 py-3 transition-all"
              style={{
                background: c.id === activeId ? 'rgba(22,199,132,0.08)' : 'transparent',
                borderLeft: c.id === activeId ? '2px solid var(--green)' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (c.id !== activeId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={e => {
                if (c.id !== activeId) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <p className="text-xs font-medium truncate" style={{ color: c.id === activeId ? 'var(--green)' : 'white' }}>
                {c.question}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{timeAgo(c.created_at)}</span>
                {c.tickers?.slice(0, 2).map(t => (
                  <span key={t} className="text-xs rounded px-1.5 py-0.5"
                    style={{ background: 'rgba(22,199,132,0.1)', color: 'var(--green)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg)' }}>

        {/* Mobile header bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(s => !s)}
            className="text-white p-1 rounded"
            style={{ border: '1px solid var(--border)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <span className="text-sm font-medium text-white truncate">
            {isCompose ? 'New Research' : (activeConversation?.question ?? 'Research')}
          </span>
        </div>

        {/* ── Compose form (new question) ── */}
        {isCompose && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-2xl">
              <h1 className="text-2xl font-bold text-white mb-1">Stock Research</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
                Ask about Indian stocks, portfolio management, or investment strategies.
              </p>

              <form onSubmit={submitQuestion} className="space-y-3">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    className="w-full rounded-2xl px-5 py-4 text-white text-sm resize-none focus:outline-none min-h-[120px]"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                    placeholder="Ask anything about Indian stocks…"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitQuestion(e as any) }}
                    disabled={submitting}
                    rows={4}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !draft.trim()}
                    className="absolute bottom-3 right-3 px-4 py-2 text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40"
                    style={{ background: 'var(--green)', color: '#000' }}
                  >
                    {submitting ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : '→'}
                  </button>
                </div>

                {submitError && <p className="text-sm text-red-400">{submitError}</p>}
                {submitting && (
                  <p className="text-xs animate-pulse" style={{ color: 'var(--muted)' }}>
                    Running multi-perspective analysis… (15–30s)
                  </p>
                )}
              </form>

              {!submitting && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Try asking</p>
                  <div className="space-y-2">
                    {EXAMPLES.map(ex => (
                      <button key={ex} onClick={() => setDraft(ex)}
                        className="w-full text-left text-sm rounded-xl px-4 py-2.5 transition-all"
                        style={cardStyle}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--green-dim)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}>
                        <span style={{ color: 'var(--muted)' }}>{ex}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Conversation thread ── */}
        {!isCompose && activeId && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Conversation header */}
            <div className="flex-shrink-0 px-6 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-medium text-white truncate">
                {activeConversation?.question ?? '…'}
              </p>
              {activeConversation?.tickers?.length ? (
                <div className="flex gap-1 mt-1">
                  {activeConversation.tickers.map(t => (
                    <span key={t} className="text-xs rounded px-1.5 py-0.5"
                      style={{ background: 'rgba(22,199,132,0.1)', color: 'var(--green)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Messages scrollable area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
              {msgLoading && (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="rounded-xl h-20 animate-pulse" style={{ background: 'var(--bg-card)' }} />
                  ))}
                </div>
              )}

              {!msgLoading && messages.map(m => (
                <MessageBubble key={m.id} msg={m} />
              ))}

              {followUpLoading && <Spinner label="Analysing your question…" />}
              <div ref={bottomRef} />
            </div>

            {/* Follow-up input */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
              <form onSubmit={submitFollowUp}
                className="flex items-end gap-2 rounded-2xl p-3"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <textarea
                  ref={followUpRef}
                  className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none min-h-[36px] max-h-32"
                  placeholder="Ask a follow-up…"
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFollowUp(e as any) }
                  }}
                  disabled={followUpLoading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={followUpLoading || !followUp.trim()}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                  style={{ background: 'var(--green)', color: '#000' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--muted)' }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isCompose && !activeId && conversations.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p style={{ color: 'var(--muted)' }} className="text-sm mb-4">Select a conversation or start a new one</p>
              <button onClick={startNew}
                className="text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ background: 'var(--green)', color: '#000' }}>
                + New Research
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
