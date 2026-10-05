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

export async function extractTickers(question: string): Promise<string[]> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: FINANCE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Extract all Indian stock NSE ticker symbols from this question. Return ONLY a JSON array of uppercase NSE symbols (e.g. ["MUTHOOTFIN","HDFCBANK"]). If none found return []. Question: "${question}"`,
    }],
  })
  try {
    const text = (msg.content[0] as { type: string; text: string }).text
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
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
${screener.error ? `Data note: ${screener.error}` : ''}
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
    max_tokens: 1500,
    system: FINANCE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Answer this investment question using the data provided. Be direct, specific, use actual numbers. Format in clean markdown with headers.

Question: ${question}
${portfolioContext ? `\nUser's Portfolio:\n${portfolioContext}\n` : ''}
${stockContext ? `\nStock Analysis Data:\n${stockContext}` : ''}

Give a comprehensive answer directly addressing the question. Reference specific holdings and their performance where relevant. End with a clear actionable recommendation.`,
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
      content: first.content + (portfolioBlock && !first.content.includes('current portfolio') ? portfolioBlock : ''),
    })
    for (const m of rest) {
      messages.push({ role: m.role, content: m.content })
    }
  }

  messages.push({ role: 'user', content: newMessage })

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: FINANCE_SYSTEM_PROMPT,
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
  growth_outlook: string
  risks: string[]
  opportunities: string[]
}> {
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0)

  const holdingsSummary = holdings.map(h => ({
    symbol: h.symbol,
    sector: h.sector ?? 'Unknown',
    cap: h.market_cap_category,
    allocation_pct: totalValue > 0 ? ((h.current_value / totalValue) * 100).toFixed(1) : '0',
    pnl_pct: h.pnl_pct.toFixed(1),
    pat_cagr_5y: h.pat_cagr_5y ?? 'N/A',
    pe: h.pe ?? 'N/A',
    roe: h.roe ?? 'N/A',
  }))

  const prompt = `Analyze this portfolio and return a JSON health assessment. No markdown fences.

Holdings:
${JSON.stringify(holdingsSummary, null, 2)}

Total portfolio value: ₹${totalValue.toFixed(0)}

Return ONLY this JSON:
{
  "health_score": 0-100 integer,
  "summary": "2-3 sentence portfolio health summary mentioning concentration, quality, and outlook",
  "sector_concentration": [{"sector": "name", "allocation_pct": number}],
  "growth_outlook": ["one sector/stock insight per item, e.g. 'EICHERMOT: margin pressure from EV transition costs into H2 FY26'", "item 2", "item 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: FINANCE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (msg.content[0] as { type: string; text: string }).text
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Health: no JSON in response')

  return JSON.parse(match[0])
}
