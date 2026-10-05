import { NextResponse } from 'next/server'

// Kite API key + secret are now platform-level env vars (KITE_API_KEY, KITE_API_SECRET).
// Users no longer need to paste credentials — they just click "Connect with Zerodha".
// This endpoint is kept as a stub so existing bookmarks don't 404.
export async function POST() {
  return NextResponse.json({ error: 'Deprecated — credentials are no longer per-user' }, { status: 410 })
}
