// Fyers API v3 — server-side only (credentials never leave the server)
const FYERS_BASE = 'https://api-t2.fyers.in/api/v3'

export type FyersBalance = {
  total_balance: number
  used_margin: number
  available_margin: number
  opening_balance: number
}

export type FyersPosition = {
  symbol: string
  qty: number
  side: number       // 1 = long, -1 = short
  avg_price: number
  ltp: number
  pnl: number
  realized_profit: number
}

export type FyersTrade = {
  order_id: string
  id: string
  symbol: string
  qty: number
  trade_price: number
  side: number       // 1 = buy, -1 = sell
  trade_value: number
  order_date_time: string
  product_type: string
  type: number
}

function authHeader(clientId: string, accessToken: string) {
  return { Authorization: `${clientId}:${accessToken}` }
}

export async function getFyersFunds(
  clientId: string,
  accessToken: string,
): Promise<FyersBalance> {
  const res = await fetch(`${FYERS_BASE}/funds`, {
    headers: authHeader(clientId, accessToken),
  })
  const json = await res.json()
  if (json.s !== 'ok') throw new Error(json.message ?? 'Fyers funds error')

  const fund = json.fund_limit ?? []
  const get  = (title: string) =>
    fund.find((f: { title: string; equityAmount: number }) => f.title === title)
      ?.equityAmount ?? 0

  return {
    total_balance:     get('Total Balance'),
    used_margin:       get('Margin Utilized') || get('Used Margin'),
    available_margin:  get('Available Balance') || get('Clear Balance'),
    opening_balance:   get('Opening Balance') || get('Total Balance'),
  }
}

export async function getFyersPositions(
  clientId: string,
  accessToken: string,
): Promise<FyersPosition[]> {
  const res = await fetch(`${FYERS_BASE}/positions`, {
    headers: authHeader(clientId, accessToken),
  })
  const json = await res.json()
  if (json.s !== 'ok') return []

  return (json.netPositions ?? []).map((p: Record<string, number | string>) => ({
    symbol:           String(p.symbol),
    qty:              Number(p.netQty),
    side:             Number(p.side),
    avg_price:        Number(p.netAvg),
    ltp:              Number(p.ltp),
    pnl:              Number(p.unrealizedProfit ?? p.pl ?? 0),
    realized_profit:  Number(p.realized_profit ?? 0),
  }))
}

export async function getFyersTradebook(
  clientId: string,
  accessToken: string,
): Promise<FyersTrade[]> {
  const res = await fetch(`${FYERS_BASE}/tradebook`, {
    headers: authHeader(clientId, accessToken),
  })
  const json = await res.json()
  if (json.s !== 'ok') return []

  return (json.tradeBook ?? []).map((t: Record<string, unknown>) => ({
    order_id:        String(t.orderId ?? t.orderNumber ?? ''),
    id:              String(t.id ?? t.tradeId ?? ''),
    symbol:          String(t.symbol),
    qty:             Number(t.tradedQty),
    trade_price:     Number(t.tradePrice),
    side:            Number(t.side),
    trade_value:     Number(t.tradedQty) * Number(t.tradePrice),
    order_date_time: String(t.orderDateTime ?? ''),
    product_type:    String(t.productType ?? ''),
    type:            Number(t.type ?? 0),
  }))
}

// ── Fyers OAuth helpers ───────────────────────────────────────────────────────

export function buildFyersAuthUrl(appId: string, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    state,
  })
  return `https://api-t2.fyers.in/api/v3/generate-authcode?${params}`
}

export async function exchangeAuthCode(
  appId: string,
  secretKey: string,
  authCode: string,
): Promise<string> {
  // Fyers requires SHA-256(appId:secretKey) as appIdHash
  const encoder = new TextEncoder()
  const data     = encoder.encode(`${appId}:${secretKey}`)
  const hashBuf  = await crypto.subtle.digest('SHA-256', data)
  const appIdHash = Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const res = await fetch(`${FYERS_BASE}/validate-authcode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      appIdHash,
      code: authCode,
    }),
  })
  const json = await res.json()
  if (json.s !== 'ok') throw new Error(json.message ?? 'Token exchange failed')
  return json.access_token as string
}
