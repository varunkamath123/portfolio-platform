// MiroFish 6-agent analysis via Claude API
import Anthropic from '@anthropic-ai/sdk'
import { fetchScreenerData, fetchLivePrice, type ScreenerData } from './screener'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  analysis_md: string
}

// Extract NSE ticker symbols from a free-text question
export async function extractTickers(question: string): Promise<string[]> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
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
PE (TTM): ${screener.pe ?? 'N/A'}
ROE: ${screener.roe ?? 'N/A'}%
ROCE: ${screener.roce ?? 'N/A'}%
5Y PAT CAGR: ${screener.pat_cagr_5y ?? 'N/A'}%
3Y PAT CAGR: ${screener.pat_cagr_3y ?? 'N/A'}%
PEG (5Y): ${peg5y ?? 'N/A'}
Book Value: ₹${screener.book_value ?? 'N/A'}
Market Cap: ₹${screener.market_cap_cr ?? 'N/A'} Cr
Dividend Yield: ${screener.dividend_yield ?? 'N/A'}%
52W High: ₹${screener.high_52w ?? 'N/A'}
52W Low: ₹${screener.low_52w ?? 'N/A'}
From 52W High: ${screener.high_52w ? ((cmp / screener.high_52w - 1) * 100).toFixed(1) : 'N/A'}%
${screener.error ? `Data fetch note: ${screener.error}` : ''}
`.trim()

  const prompt = `You are a MiroFish 6-agent investment analysis system. Analyze ${symbol} using the data below and respond with a JSON object ONLY (no markdown fences).

Data:
${dataContext}

Return this exact JSON structure:
{
  "agents": [
    {"agent": "GRAHAM", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "BUFFETT", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "PABRAI", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "GARP", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "MACRO", "score": 0-10, "reasoning": "one sentence"},
    {"agent": "DEVIL", "score": 0-10, "reasoning": "one sentence"}
  ],
  "composite": number (average of 6 scores, 1 decimal),
  "verdict": "BUY / HOLD / SELL / WATCH — one line reason",
  "bull_case": ["point 1", "point 2", "point 3"],
  "bear_case": ["point 1", "point 2", "point 3"],
  "entry": suggested entry price or null,
  "stop": stop loss price or null,
  "target1": first target price or null,
  "rr": risk reward ratio or null,
  "analysis_md": "3-4 paragraph markdown analysis covering valuation, quality, momentum, and key risk. Be direct and specific."
}

Agent scoring criteria:
- GRAHAM: margin of safety, PE vs intrinsic value, debt, asset backing
- BUFFETT: moat quality, ROE consistency, brand, pricing power
- PABRAI: asymmetric upside, beaten-down quality business, downside protection
- GARP: PEG ratio quality, growth vs price paid, earnings delivery
- MACRO: sector tailwinds, rate cycle, policy environment
- DEVIL: risks the bulls ignore, what could go wrong, regulatory/competition`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (msg.content[0] as { type: string; text: string }).text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('MiroFish: no JSON in response')

  const parsed = JSON.parse(jsonMatch[0])

  return {
    symbol,
    screener,
    live_price: livePrice,
    peg_5y: peg5y,
    agents: parsed.agents,
    composite: parsed.composite,
    verdict: parsed.verdict,
    bull_case: parsed.bull_case,
    bear_case: parsed.bear_case,
    entry: parsed.entry,
    stop: parsed.stop,
    target1: parsed.target1,
    rr: parsed.rr,
    analysis_md: parsed.analysis_md,
  }
}

// Answer a free-form stock question with context from Screener + MiroFish
export async function answerStockQuestion(
  question: string,
  tickers: string[],
): Promise<{ answer_md: string; mirofish: MiroFishResult[] }> {
  const mirofish = await Promise.all(tickers.slice(0, 3).map(t => runMiroFish(t)))

  const context = mirofish.map(r => `
### ${r.symbol}
CMP ₹${r.live_price ?? r.screener.cmp} | PE ${r.screener.pe}x | ROE ${r.screener.roe}% | ROCE ${r.screener.roce}% | 5Y CAGR ${r.screener.pat_cagr_5y}% | PEG ${r.peg_5y}
MiroFish Composite: ${r.composite}/10 | Verdict: ${r.verdict}
Bull: ${r.bull_case.join('; ')}
Bear: ${r.bear_case.join('; ')}
`).join('\n')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Answer this investment question using the MiroFish analysis data provided. Be direct, specific, and use actual numbers. Format in clean markdown with headers.

Question: ${question}

MiroFish Analysis Data:
${context}

Give a comprehensive answer that directly addresses what was asked. Include specific numbers, PE ratios, PEG ratios, and price targets where relevant. End with a clear actionable recommendation.`,
    }],
  })

  const answer_md = (msg.content[0] as { type: string; text: string }).text

  return { answer_md, mirofish }
}
