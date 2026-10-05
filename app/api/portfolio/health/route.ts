import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { generatePortfolioHealth } from '@/lib/mirofish'

// POST /api/portfolio/health — accepts pre-fetched holdings from client to avoid double Kite + Screener fetch
// Client sends the enriched holdings array from /api/kite/portfolio
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const holdings: {
    symbol: string
    sector: string | null
    market_cap_category: string
    pnl_pct: number
    current_value: number
    pat_cagr_5y: number | null
    pe: number | null
    roe: number | null
  }[] = body.holdings ?? []

  if (!holdings.length) {
    return NextResponse.json({ error: 'No holdings provided' }, { status: 400 })
  }

  const health = await generatePortfolioHealth(holdings.slice(0, 15))
  return NextResponse.json(health)
}
