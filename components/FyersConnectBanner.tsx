'use client'
import { useState } from 'react'

export function FyersConnectBanner({ expired = false }: { expired?: boolean }) {
  const [loading, setLoading] = useState(false)

  async function connect() {
    setLoading(true)
    const res  = await fetch('/api/fyers/auth/url')
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-amber-800">
          {expired ? 'Fyers session expired' : 'Connect your Fyers account'}
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          {expired
            ? 'Your daily token has expired. Re-connect to refresh.'
            : 'Link your Fyers account to see live balance and trades.'}
        </p>
      </div>
      <button
        onClick={connect}
        disabled={loading}
        className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Redirecting…' : expired ? 'Re-connect' : 'Connect'}
      </button>
    </div>
  )
}
