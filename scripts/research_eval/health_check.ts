// Runs generatePortfolioHealth N times on a fixed portfolio; reports latency + failures.
// Usage: npx tsx --env-file=.env.local scripts/research_eval/health_check.ts [n]
import { generatePortfolioHealth } from '../../lib/mirofish'

const H = [
  ['GRSE','Ship Building & Allied Services','Mid Cap',125.5,106865,36,30.6,31.6],
  ['EICHERMOT','2/3 Wheelers','Large Cap',80.3,56408,22,35,24],
  ['POLYCAB','Cables - Electricals','Large Cap',36.5,48882,40,43.8,24],
  ['GOLDBEES','Precious Metals','Precious Metals',58.1,48584,null,null,null],
  ['ICICIBANK','Private Sector Bank','Large Cap',46.8,40284,32,18,18],
  ['SHRIRAMFIN','NBFC','Large Cap',23.1,33777,32,20,16.4],
  ['HDFCBANK','Private Sector Bank','Large Cap',15.7,28458,19,14.5,14],
  ['INFY','Computers - Software & Consulting','Large Cap',-9.7,25346,9,22,29],
  ['TCS','Computers - Software & Consulting','Large Cap',-20,21000,8,22,50],
] as const

const holdings = H.map(([symbol, sector, market_cap_category, pnl_pct, current_value, pat_cagr_5y, pe, roe]) =>
  ({ symbol, sector, market_cap_category, pnl_pct, current_value, pat_cagr_5y, pe, roe }))

async function main() {
const n = Number(process.argv[2] ?? 5)
const runs = await Promise.all(Array.from({ length: n }, async (_, i) => {
  const t0 = Date.now()
  try {
    const h = await generatePortfolioHealth(holdings)
    return `#${i + 1} OK   ${((Date.now() - t0) / 1000).toFixed(1)}s score=${h.health_score}`
  } catch (e) {
    return `#${i + 1} FAIL ${((Date.now() - t0) / 1000).toFixed(1)}s ${String(e).slice(0, 300)}`
  }
}))
console.log(runs.join('\n'))
}

main()
