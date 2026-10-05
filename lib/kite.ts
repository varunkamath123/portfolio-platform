// Zerodha Kite Connect v3 — server-side only
import crypto from 'crypto'

const KITE_BASE = 'https://api.kite.trade'

export type KiteHolding = {
  tradingsymbol: string
  exchange: string
  isin: string
  quantity: number
  average_price: number
  last_price: number
  pnl: number
  day_change: number
  day_change_percentage: number
  close_price: number
  t1_quantity: number
}

export type KitePosition = {
  tradingsymbol: string
  exchange: string
  quantity: number
  average_price: number
  last_price: number
  pnl: number
  product: string
}

function kiteHeaders(apiKey: string, accessToken: string) {
  return {
    'X-Kite-Version': '3',
    Authorization: `token ${apiKey}:${accessToken}`,
  }
}

// Build the Kite login URL — redirect user here to initiate OAuth
export function buildKiteLoginUrl(apiKey: string, redirectUrl: string) {
  return `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3&redirect_params=${encodeURIComponent(`redirect_url=${redirectUrl}`)}`
}

// Exchange request_token for access_token
// Checksum = SHA-256(api_key + request_token + api_secret)
export async function exchangeRequestToken(
  apiKey: string,
  apiSecret: string,
  requestToken: string,
): Promise<string> {
  const raw = apiKey + requestToken + apiSecret
  const checksum = crypto.createHash('sha256').update(raw).digest('hex')

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  })

  const res = await fetch(`${KITE_BASE}/session/token`, {
    method: 'POST',
    headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const json = await res.json()
  if (json.status !== 'success') throw new Error(json.message ?? 'Kite token exchange failed')
  return json.data.access_token as string
}

export async function getKiteHoldings(
  apiKey: string,
  accessToken: string,
): Promise<KiteHolding[]> {
  const res = await fetch(`${KITE_BASE}/portfolio/holdings`, {
    headers: kiteHeaders(apiKey, accessToken),
  })
  const json = await res.json()
  if (json.status !== 'success') throw new Error(json.message ?? 'Failed to fetch holdings')
  return json.data ?? []
}

export async function getKitePositions(
  apiKey: string,
  accessToken: string,
): Promise<KitePosition[]> {
  const res = await fetch(`${KITE_BASE}/portfolio/positions`, {
    headers: kiteHeaders(apiKey, accessToken),
  })
  const json = await res.json()
  if (json.status !== 'success') return []
  return [...(json.data?.net ?? []), ...(json.data?.day ?? [])].filter(p => p.quantity !== 0)
}

// Check if stored token is still valid (Kite tokens expire at 6 AM IST next day)
export function isTokenValid(tokenDate: string): boolean {
  const stored = new Date(tokenDate)
  const now = new Date()
  // Token expires 6 AM IST = 0:30 UTC next day
  const expiry = new Date(stored)
  expiry.setUTCDate(expiry.getUTCDate() + 1)
  expiry.setUTCHours(0, 30, 0, 0)
  return now < expiry
}
