// Screener.in data fetcher — parses key metrics for a given NSE symbol

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
  error?: string
}

function parseNumber(text: string): number | null {
  const n = parseFloat(text.replace(/[,%₹\s]/g, ''))
  return isNaN(n) ? null : n
}

function extract(html: string, label: string): number | null {
  // Match label followed by value in a nearby element
  const patterns = [
    new RegExp(`${label}[^<]*<[^>]+>([\\d,\\.]+)`, 'i'),
    new RegExp(`>${label}<[^>]*>[^<]*<[^>]*>([\\d,\\.%]+)`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return parseNumber(m[1])
  }
  return null
}

export async function fetchScreenerData(symbol: string): Promise<ScreenerData> {
  const base: ScreenerData = {
    symbol, cmp: 0, pe: null, roe: null, roce: null,
    pat_cagr_5y: null, pat_cagr_3y: null, book_value: null,
    market_cap_cr: null, dividend_yield: null,
    high_52w: null, low_52w: null,
    debt_to_equity: null, promoter_holding: null,
  }

  try {
    const res = await fetch(`https://www.screener.in/company/${symbol}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 3600 }, // cache 1 hour
    })

    if (!res.ok) return { ...base, error: `HTTP ${res.status}` }
    const html = await res.text()

    // Extract ratios from the ratio section
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

    // Compounded Profit Growth — 5Y and 3Y
    const cgSection = html.match(/Compounded Profit Growth[\s\S]*?(?=Compounded Sales Growth|Stock Price CAGR|$)/i)?.[0] ?? ''
    const cg5y = cgSection.match(/5 Years?[^\d]*([\d\.]+)%/i)
    const cg3y = cgSection.match(/3 Years?[^\d]*([\d\.]+)%/i)
    if (cg5y) base.pat_cagr_5y = parseNumber(cg5y[1])
    if (cg3y) base.pat_cagr_3y = parseNumber(cg3y[1])

    return base
  } catch (e) {
    return { ...base, error: String(e) }
  }
}

// Fetch live price from Yahoo Finance (backup if Screener CMP is stale)
export async function fetchLivePrice(symbol: string): Promise<number | null> {
  try {
    const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const json = await res.json()
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}
