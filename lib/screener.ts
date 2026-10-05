// Screener.in data fetcher — parses key metrics for a given NSE symbol

export type MarketCapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Unknown'

export type ScreenerData = {
  symbol: string
  cmp: number
  pe: number | null
  roe: number | null
  roce: number | null
  pat_cagr_5y: number | null
  pat_cagr_3y: number | null
  book_value: number | null
  market_cap_cr: number | null
  dividend_yield: number | null
  high_52w: number | null
  low_52w: number | null
  debt_to_equity: number | null
  promoter_holding: number | null
  sector: string | null
  market_cap_category: MarketCapCategory
  error?: string
}

function parseNumber(text: string): number | null {
  const n = parseFloat(text.replace(/[,%₹\s]/g, ''))
  return isNaN(n) ? null : n
}

// SEBI-aligned thresholds (July 2024 list):
// Large Cap = top 100 by market cap → ~₹60,000 Cr+
// Mid Cap = 101-250 → ~₹15,000-60,000 Cr
// Small Cap = 251+ → < ₹15,000 Cr
function getMarketCapCategory(mcap: number | null): MarketCapCategory {
  if (!mcap) return 'Unknown'
  if (mcap >= 60000) return 'Large Cap'
  if (mcap >= 15000) return 'Mid Cap'
  return 'Small Cap'
}

export async function fetchScreenerData(symbol: string): Promise<ScreenerData> {
  const base: ScreenerData = {
    symbol, cmp: 0, pe: null, roe: null, roce: null,
    pat_cagr_5y: null, pat_cagr_3y: null, book_value: null,
    market_cap_cr: null, dividend_yield: null,
    high_52w: null, low_52w: null,
    debt_to_equity: null, promoter_holding: null,
    sector: null, market_cap_category: 'Unknown',
  }

  try {
    const res = await fetch(`https://www.screener.in/company/${symbol}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return { ...base, error: `HTTP ${res.status}` }
    const html = await res.text()

    const ratioSection = html.match(/<section[^>]*id="top-ratios"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? html

    // CMP
    const cmpMatch = html.match(/<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)<\/span>/)
    if (cmpMatch) base.cmp = parseNumber(cmpMatch[1]) ?? 0

    // PE
    const peMatch = ratioSection.match(/Stock P\/E[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)/i)
    if (peMatch) base.pe = parseNumber(peMatch[1])

    // Book Value
    const bvMatch = ratioSection.match(/Book Value[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)/i)
    if (bvMatch) base.book_value = parseNumber(bvMatch[1])

    // Dividend Yield
    const dyMatch = ratioSection.match(/Dividend Yield[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)/i)
    if (dyMatch) base.dividend_yield = parseNumber(dyMatch[1])

    // ROCE
    const roceMatch = ratioSection.match(/ROCE[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)/i)
    if (roceMatch) base.roce = parseNumber(roceMatch[1])

    // ROE
    const roeMatch = ratioSection.match(/ROE[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)/i)
    if (roeMatch) base.roe = parseNumber(roeMatch[1])

    // Market Cap
    const mcapMatch = ratioSection.match(/Market Cap[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)/i)
    if (mcapMatch) base.market_cap_cr = parseNumber(mcapMatch[1])

    // High / Low
    const hlMatch = ratioSection.match(/High \/ Low[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,\.]+)\s*\/\s*([\d,\.]+)/i)
    if (hlMatch) {
      base.high_52w = parseNumber(hlMatch[1])
      base.low_52w = parseNumber(hlMatch[2])
    }

    // PAT CAGR
    const cgSection = html.match(/Compounded Profit Growth[\s\S]*?(?=Compounded Sales Growth|Stock Price CAGR|$)/i)?.[0] ?? ''
    const cg5y = cgSection.match(/5 Years?[^\d]*([\d\.]+)%/i)
    const cg3y = cgSection.match(/3 Years?[^\d]*([\d\.]+)%/i)
    if (cg5y) base.pat_cagr_5y = parseNumber(cg5y[1])
    if (cg3y) base.pat_cagr_3y = parseNumber(cg3y[1])

    const decodeHtml = (s: string) =>
      s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')

    // Screener.in uses a peer-comparison breadcrumb with title attributes:
    // <a href="/market/..." title="Sector">Capital Goods</a>
    // Try "Sector" level first (e.g. Capital Goods), fall back to "Broad Sector" (e.g. Industrials)
    const sectorPatterns = [
      /<a[^>]*title="Sector"[^>]*>([^<]+)<\/a>/i,
      /<a[^>]*title="Broad Sector"[^>]*>([^<]+)<\/a>/i,
      /<a[^>]*title="Broad Industry"[^>]*>([^<]+)<\/a>/i,
    ]
    for (const pat of sectorPatterns) {
      const m = html.match(pat)
      if (m) {
        const candidate = decodeHtml(m[1].trim())
        if (candidate.length <= 40 && !/nifty|sensex|bse|index|\d/i.test(candidate)) {
          base.sector = candidate
          break
        }
      }
    }

    base.market_cap_category = getMarketCapCategory(base.market_cap_cr)

    return base
  } catch (e) {
    return { ...base, error: String(e) }
  }
}

export async function fetchLivePrice(symbol: string): Promise<number | null> {
  try {
    const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const json = await res.json()
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}
