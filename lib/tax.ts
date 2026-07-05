// Indian F&O tax and charge estimates
// F&O P&L = speculative business income → taxed at income-tax slab rate
// We show estimated tax at 30% slab (highest) as a conservative default

export type ChargeBreakdown = {
  brokerage: number
  stt: number
  exchange_charges: number
  sebi_charges: number
  gst: number
  stamp_duty: number
  total: number
}

// Trade value = quantity * price (one side)
export function calculateCharges(
  tradeValue: number,
  side: 'BUY' | 'SELL',
  instrumentType: 'OPTIONS' | 'FUTURES' | 'EQUITY' = 'OPTIONS',
): ChargeBreakdown {
  // Fyers flat brokerage: ₹20/order or 0.0003 × trade value, whichever lower
  const brokerage = Math.min(20, tradeValue * 0.0003)

  // STT — on OPTIONS: 0.0625% on premium on sell side only
  //       on FUTURES: 0.0125% on both sides
  let stt = 0
  if (instrumentType === 'OPTIONS' && side === 'SELL') stt = tradeValue * 0.000625
  if (instrumentType === 'FUTURES') stt = tradeValue * 0.000125
  if (instrumentType === 'EQUITY' && side === 'SELL') stt = tradeValue * 0.001

  // NSE exchange transaction charge: 0.053% F&O, 0.00345% Equity
  const exchange_charges =
    instrumentType === 'EQUITY' ? tradeValue * 0.0000345 : tradeValue * 0.00053

  // SEBI charges: ₹10 per crore (0.000001)
  const sebi_charges = tradeValue * 0.000001

  // GST: 18% on (brokerage + exchange charges)
  const gst = (brokerage + exchange_charges) * 0.18

  // Stamp duty: 0.003% on buy side (F&O), 0.015% Equity buy
  const stamp_duty =
    side === 'BUY'
      ? tradeValue * (instrumentType === 'EQUITY' ? 0.00015 : 0.00003)
      : 0

  const total = brokerage + stt + exchange_charges + sebi_charges + gst + stamp_duty

  return {
    brokerage: round2(brokerage),
    stt: round2(stt),
    exchange_charges: round2(exchange_charges),
    sebi_charges: round2(sebi_charges),
    gst: round2(gst),
    stamp_duty: round2(stamp_duty),
    total: round2(total),
  }
}

// Estimated tax on F&O profits (business income, 30% slab)
export function estimateTax(profit: number, taxRate = 0.30): number {
  if (profit <= 0) return 0
  return round2(profit * taxRate)
}

export function pnlAfterTax(pnl: number, charges: number, taxRate = 0.30): number {
  const netBeforeTax = pnl - charges
  const tax = estimateTax(netBeforeTax, taxRate)
  return round2(netBeforeTax - tax)
}

function round2(n: number) { return Math.round(n * 100) / 100 }
