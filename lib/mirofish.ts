// Multi-perspective investment analysis via Claude API
import Anthropic from '@anthropic-ai/sdk'
import { fetchScreenerData, fetchLivePrice, type ScreenerData } from './screener'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FINANCE_SYSTEM_PROMPT = `You are a professional investment research assistant specializing in Indian equities and portfolio management. You only answer questions about:
- Indian stocks, NSE/BSE listed companies
- Portfolio management, asset allocation, diversification
- Investment strategies (value, growth, GARP, momentum)
- Market indices (NIFTY, SENSEX, BANKNIFTY, etc.)
- Financial metrics (PE, ROE, ROCE, EPS, debt ratios, CAGR)
- Macroeconomic context as it relates to Indian markets
- Mutual funds and ETFs focused on India
- Options and futures on Indian instruments

If asked anything outside finance, investing, or portfolio management, politely decline with: "I'm focused on finance and portfolio research. Please ask me about stocks, investments, or portfolio analysis."

Always be direct, data-driven, and specific. Use actual numbers when available.`

// Shape of every prose answer shown in the Research UI (first answer + follow-ups)
const ANSWER_STYLE = `
FORMAT — the reader is an individual investor, often on a phone. Keep it scannable:
- Open with a one-line blockquote: "> **Bottom line:** <direct answer in 1-2 sentences>".
- Then 2-4 short sections with "## " headings. No "# " title (the question is already shown). No emojis.
- Bullets over paragraphs; max ~5 bullets per section, one line each where possible. Bold only the key number or verdict in a bullet.
- Use a table only when comparing 2+ stocks or options across metrics (max 6 rows).
- End with "## What to do" — 2-4 numbered, concrete actions tied to the user's holdings where relevant.
- Aim for 250-400 words. Never pad.

DATA DISCIPLINE:
- Today is {TODAY}. Frame timelines from today — never refer to past years as upcoming.
- Only quote prices/ratios present in the data provided. If data for a stock is missing, say "Live data for <SYMBOL> is unavailable right now" in one line instead of estimating from memory or describing internal data feeds.
- Use the pre-computed Value/Weight figures from the portfolio as-is. When proposing target weights they must sum to 100%; rupee amounts = weight change × total value; share counts = rupee amount ÷ LTP. Check these sums before answering.
- For banks and NBFCs, ROCE is not meaningful (deposits/borrowings are raw material) — judge them on ROE, asset quality and growth instead.
- Don't restate the user's whole portfolio; reference only the holdings that matter to the question.`

function researchSystemPrompt() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
  return `${FINANCE_SYSTEM_PROMPT}\n${ANSWER_STYLE.replace('{TODAY}', today)}`
}

export type AgentScore = { agent: string; score: number; reasoning: string }

export type MiroFishResult = {
  symbol: string
  screener: ScreenerData
  live_price: number | null
  peg_5y: number | null
  agents: AgentScore[]
  composite: number
  verdict: string
  bull_case: string[]
  bear_case: string[]
  entry: number | null
  stop: number | null
  target1: number | null
  rr: number | null
  analysis_md: string | null
}

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

// Old NSE symbols the model still emits from training data → current symbol
const RENAMED_SYMBOLS: Record<string, string> = {
  ZOMATO: 'ETERNAL',
  HDFC: 'HDFCBANK',
  LTI: 'LTIM',
  MINDTREE: 'LTIM',
  ADANITRANS: 'ADANIENSOL',
  MOTHERSUMI: 'MOTHERSON',
  KEIIND: 'KEI',
  KEIINDUSTRIES: 'KEI',
  KEIINDUS: 'KEI',
}

export async function extractTickers(question: string): Promise<string[]> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: FINANCE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Extract all Indian stock NSE ticker symbols from this question. Return ONLY a JSON array of uppercase NSE symbols (e.g. ["MUTHOOTFIN","HDFCBANK"]). Use the CURRENT NSE symbol for renamed companies (e.g. Zomato → ETERNAL). If none found return []. Question: "${question}"`,
    }],
  })
  try {
    const text = (msg.content[0] as { type: string; text: string }).text
    const match = text.match(/\[[\s\S]*\]/)
    const tickers: string[] = match ? JSON.parse(match[0]) : []
    return [...new Set(tickers.map(t => RENAMED_SYMBOLS[t] ?? t))]
  } catch {
    return []
  }
}

export async function runMiroFish(symbol: string): Promise<MiroFishResult> {
  const [screener, livePrice] = await Promise.all([
    fetchScreenerData(symbol),
    fetchLivePrice(symbol),
  ])

  const cmp = livePrice ?? screener.cmp
  const peg5y = (screener.pe && screener.pat_cagr_5y)
    ? Math.round((screener.pe / screener.pat_cagr_5y) * 100) / 100
    : null

  const dataContext = `
Stock: ${symbol}
CMP: ₹${cmp}
Sector: ${screener.sector ?? 'N/A'}
Market Cap: ₹${screener.market_cap_cr ?? 'N/A'} Cr (${screener.market_cap_category})
PE (TTM): ${screener.pe ?? 'N/A'}
ROE: ${screener.roe ?? 'N/A'}%
ROCE: ${screener.roce ?? 'N/A'}%
5Y PAT CAGR: ${screener.pat_cagr_5y ?? 'N/A'}%
3Y PAT CAGR: ${screener.pat_cagr_3y ?? 'N/A'}%
PEG (5Y): ${peg5y ?? 'N/A'}
Book Value: ₹${screener.book_value ?? 'N/A'}
Dividend Yield: ${screener.dividend_yield ?? 'N/A'}%
52W High: ₹${screener.high_52w ?? 'N/A'}
52W Low: ₹${screener.low_52w ?? 'N/A'}
From 52W High: ${screener.high_52w ? ((cmp / screener.high_52w - 1) * 100).toFixed(1) : 'N/A'}%
${screener.error ? `Data note: live data for ${symbol} is unavailable (the symbol may be wrong) — do not quote numbers for it` : ''}
`.trim()

  const prompt = `Analyze ${symbol} using the data below. Respond with a JSON object ONLY (no markdown fences).

Data:
${dataContext}

Return this exact JSON (no extra fields):
{
  "agents": [
    {"agent": "GRAHAM", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "BUFFETT", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "PABRAI", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "GARP", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "MACRO", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "DEVIL", "score": 0-10, "reasoning": "one sentence"}
  ],
  "composite": number 0-10,
  "verdict": "BUY/HOLD/SELL/WATCH — one line",
  "bull_case": ["point 1", "point 2", "point 3"],
  "bear_case": ["point 1", "point 2", "point 3"],
  "entry": price or null,
  "stop": price or null,
  "target1": price or null,
  "rr": ratio or null
}

GRAHAM=margin of safety+PE vs intrinsic value; BUFFETT=moat+ROE consistency; PABRAI=asymmetric upside; GARP=PEG+growth vs price; MACRO=sector tailwinds+policy; DEVIL=key risks bulls ignore`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: FINANCE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (msg.content[0] as { type: string; text: string }).text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Analysis: no JSON in response')

  const parsed = JSON.parse(jsonMatch[0])

  return {
    symbol, screener, live_price: livePrice, peg_5y: peg5y,
    agents: parsed.agents, composite: parsed.composite,
    verdict: parsed.verdict, bull_case: parsed.bull_case,
    bear_case: parsed.bear_case, entry: parsed.entry,
    stop: parsed.stop, target1: parsed.target1,
    rr: parsed.rr, analysis_md: null,
  }
}

export async function answerStockQuestion(
  question: string,
  tickers: string[],
  portfolioContext?: string,
): Promise<{ answer_md: string; mirofish: MiroFishResult[] }> {
  // Cap at 2 tickers to stay within Vercel's 10s function limit
  const mirofish = await Promise.all(tickers.slice(0, 2).map(t => runMiroFish(t)))

  const stockContext = mirofish.map(r => `
### ${r.symbol} (${r.screener.sector ?? 'Unknown'} | ${r.screener.market_cap_category})
CMP ₹${r.live_price ?? r.screener.cmp} | PE ${r.screener.pe}x | ROE ${r.screener.roe}% | ROCE ${r.screener.roce}% | 5Y CAGR ${r.screener.pat_cagr_5y}% | PEG ${r.peg_5y}
Composite: ${r.composite}/10 | Verdict: ${r.verdict}
Bull: ${r.bull_case.join('; ')}
Bear: ${r.bear_case.join('; ')}
`).join('\n')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: researchSystemPrompt(),
    messages: [{
      role: 'user',
      content: `Answer this investment question using the data provided.

Question: ${question}
${portfolioContext ? `\nUser's Portfolio:\n${portfolioContext}\n` : ''}
${stockContext ? `\nStock Analysis Data:\n${stockContext}` : ''}`,
    }],
  })

  const answer_md = (msg.content[0] as { type: string; text: string }).text
  return { answer_md, mirofish }
}

// Continue a conversation with follow-up messages — used for conversation threading
export async function continueConversation(
  originalQuestion: string,
  history: ConversationMessage[],
  newMessage: string,
  contextData?: string,
  portfolioContext?: string,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = []

  const portfolioBlock = portfolioContext ? `\n\nUser's current portfolio:\n${portfolioContext}` : ''

  // Add original context as first user message if not already in history
  if (history.length === 0) {
    messages.push({
      role: 'user',
      content: `Research question: ${originalQuestion}${portfolioBlock}${contextData ? `\n\nAnalysis context:\n${contextData}` : ''}`,
    })
  } else {
    // Inject portfolio context into the first message of history
    const [first, ...rest] = history
    messages.push({
      role: first.role,
      // Match our own block header, not the phrase — users often ask about "my current portfolio"
      content: first.content + (portfolioBlock && !first.content.includes("User's current portfolio:\n") ? portfolioBlock : ''),
    })
    for (const m of rest) {
      messages.push({ role: m.role, content: m.content })
    }
  }

  messages.push({ role: 'user', content: newMessage })

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: researchSystemPrompt(),
    messages,
  })

  return (msg.content[0] as { type: string; text: string }).text
}

// Generate portfolio health assessment for the dashboard
export async function generatePortfolioHealth(holdings: {
  symbol: string
  sector: string | null
  market_cap_category: string
  pnl_pct: number
  current_value: number
  pat_cagr_5y: number | null
  pe: number | null
  roe: number | null
}[]): Promise<{
  health_score: number
  summary: string
  sector_concentration: { sector: string; allocation_pct: number }[]
  growth_outlook: string[]
  risks: string[]
  opportunities: string[]
}> {
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0) || 1
  const pctOf = (v: number) => Math.round((v / totalValue) * 1000) / 10

  // Sector weights are plain arithmetic — compute them here rather than asking
  // the model (it was slower, sometimes wrong, and pushed output past max_tokens)
  const bySector = new Map<string, number>()
  for (const h of holdings) bySector.set(h.sector ?? 'Unknown', (bySector.get(h.sector ?? 'Unknown') ?? 0) + h.current_value)
  const sector_concentration = [...bySector.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, v]) => ({ sector, allocation_pct: pctOf(v) }))

  // Compact pipe rows: far fewer input tokens than pretty-printed JSON
  const rows = [...holdings]
    .sort((a, b) => b.current_value - a.current_value)
    .map(h => `${h.symbol} | ${h.sector ?? 'Unknown'} | ${h.market_cap_category} | weight ${pctOf(h.current_value)}% | P&L ${h.pnl_pct.toFixed(1)}% | PE ${h.pe ?? 'N/A'} | ROE ${h.roe ?? 'N/A'} | 5Y PAT CAGR ${h.pat_cagr_5y ?? 'N/A'}`)
    .join('\n')

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

  const prompt = `Today is ${today}. Assess this Indian equity portfolio's health.

Holdings (symbol | sector | cap | weight | P&L | PE | ROE | 5Y PAT CAGR):
${rows}

Sector weights: ${sector_concentration.map(s => `${s.sector} ${s.allocation_pct}%`).join(', ')}

Return ONLY minified JSON (single line, no markdown fences) with exactly these keys:
{"health_score":<0-100 integer>,"summary":"<2 sentences: concentration, quality, outlook>","growth_outlook":["<SYMBOL or sector: one insight, max 20 words>", ...exactly 3],"risks":["<max 20 words>", ...exactly 3],"opportunities":["<max 20 words>", ...exactly 2]}
Frame timelines from today. For banks/NBFCs ignore ROCE.`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    system: FINANCE_SYSTEM_PROMPT,
    // Prefill "{" so the model can only continue the JSON object (it occasionally answered in prose)
    messages: [{ role: 'user', content: prompt }, { role: 'assistant', content: '{' }],
  })

  const text = '{' + (msg.content[0] as { type: string; text: string }).text
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Health: no JSON in response (stop=${msg.stop_reason}): ${text.slice(0, 300)}`)

  let parsed: { health_score: number; summary: string; growth_outlook: string[]; risks: string[]; opportunities: string[] }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error(`Health: invalid JSON (stop=${msg.stop_reason}, out_tokens=${msg.usage.output_tokens})`)
  }
  return { ...parsed, sector_concentration }
}
