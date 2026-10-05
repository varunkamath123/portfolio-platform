'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function OnboardingPage() {
  const params = useSearchParams()
  const errorParam = params.get('error')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(errorParam ?? '')

  async function connect() {
    setLoading(true)
    setErr('')
    try {
      const r = await fetch('/api/kite/auth/url')
      const d = await r.json()
      if (d.url) {
        window.location.href = d.url
      } else {
        setErr(d.error ?? 'Could not build login URL')
        setLoading(false)
      }
    } catch {
      setErr('Network error — please try again')
      setLoading(false)
    }
  }

  const errorMsg =
    err === 'kite_auth_failed'     ? 'Kite login was cancelled. Try again.' :
    err === 'token_exchange_failed' ? 'Token exchange failed. Try again in a few seconds.' :
    err

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      {/* Logo mark */}
      <div className="text-center mb-10">
        <p className="text-4xl font-bold mb-2" style={{ color: 'var(--green)' }}>◈</p>
        <h1 className="text-2xl font-bold text-white">Connect Zerodha</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Link your Kite account to track your portfolio and get MiroFish answers.
        </p>
      </div>

      {/* Steps */}
      <div className="rounded-xl p-6 mb-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {[
          { n: 1, title: 'Click Connect below', body: 'You\'ll be redirected to Zerodha\'s login page.' },
          { n: 2, title: 'Log in with your Zerodha credentials', body: 'Enter your user ID, password, and 2FA PIN on Zerodha\'s own page — your credentials never touch this app.' },
          { n: 3, title: 'Back to your portfolio', body: 'After authorising, you land straight on your dashboard. Tokens refresh daily — you\'ll see a one-click Refresh button each morning after 6 AM.' },
        ].map(s => (
          <div key={s.n} className="flex gap-4">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{ background: 'var(--green)' }}>
              {s.n}
            </div>
            <div>
              <p className="font-medium text-white text-sm">{s.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {errorMsg}
        </div>
      )}

      <button
        onClick={connect}
        disabled={loading}
        className="w-full font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--green)', color: '#000' }}
      >
        {loading ? 'Redirecting to Zerodha…' : 'Connect with Zerodha →'}
      </button>

      <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
        Your Zerodha credentials are entered on Zerodha's own site — never here.
      </p>
    </div>
  )
}
