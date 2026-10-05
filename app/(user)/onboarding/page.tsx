'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type CredStatus = {
  has_credentials: boolean
  api_key_hint: string | null
  uses_platform_app: boolean
  redirect_url: string
}

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' }
const input = 'w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none font-mono'
const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)' }

export default function OnboardingPage() {
  const params = useSearchParams()
  const errorParam = params.get('error')
  const [status, setStatus] = useState<CredStatus | null>(null)
  const [editing, setEditing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState(errorParam ?? '')

  useEffect(() => {
    fetch('/api/users/credentials')
      .then(r => r.json())
      .then((d: CredStatus) => setStatus(d))
      .catch(() => setErr('Network error — please refresh'))
  }, [])

  const hasApp = !!status && (status.has_credentials || status.uses_platform_app)
  const showForm = !!status && (!hasApp || editing)

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const r = await fetch('/api/users/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error ?? 'Could not save'); return }
      const s = await fetch('/api/users/credentials').then(r => r.json())
      setStatus(s)
      setEditing(false)
      setApiKey('')
      setApiSecret('')
    } catch {
      setErr('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

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

  async function copyRedirect() {
    if (!status) return
    try {
      await navigator.clipboard.writeText(status.redirect_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable — user can select the text */ }
  }

  const errorMsg =
    err === 'kite_auth_failed'      ? 'Kite login was cancelled. Try again.' :
    err === 'token_exchange_failed' ? 'Token exchange failed — check your API secret is correct, then try again.' :
    err

  return (
    <div className="max-w-md mx-auto mt-16 px-4 pb-16">
      {/* Logo mark */}
      <div className="text-center mb-10">
        <p className="text-4xl font-bold mb-2" style={{ color: 'var(--green)' }}>◈</p>
        <h1 className="text-2xl font-bold text-white">Connect Zerodha</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Link your Kite account to track your portfolio and get research answers.
        </p>
      </div>

      {!status && !err && (
        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      )}

      {/* Step 1 — user's own Kite Connect app */}
      {showForm && status && (
        <div className="rounded-xl p-6 mb-6 space-y-5" style={card}>
          <div>
            <p className="font-medium text-white text-sm">Step 1 — Create your Kite Connect app</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Zerodha only lets a Kite app read the account that created it, so you need your own (one-time, ~2 minutes).
            </p>
          </div>

          <ol className="text-xs space-y-2 list-decimal pl-4" style={{ color: 'var(--muted)' }}>
            <li>
              Go to{' '}
              <a href="https://developers.kite.trade" target="_blank" rel="noopener noreferrer"
                className="underline" style={{ color: 'var(--green)' }}>
                developers.kite.trade
              </a>{' '}
              and sign up / log in with your Zerodha account.
            </li>
            <li>Create a new app (the free Personal app is enough for holdings).</li>
            <li>
              Set the <span className="text-white">Redirect URL</span> to:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded px-2 py-1.5 text-[11px] text-white" style={inputStyle}>
                  {status.redirect_url}
                </code>
                <button onClick={copyRedirect} className="text-[11px] px-2 py-1.5 rounded flex-shrink-0"
                  style={{ border: '1px solid var(--border)', color: 'var(--green)' }}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </li>
            <li>Copy the app&apos;s <span className="text-white">API key</span> and <span className="text-white">API secret</span> below.</li>
          </ol>

          <div className="space-y-3">
            <input className={input} style={inputStyle} placeholder="API key"
              value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} />
            <input className={input} style={inputStyle} placeholder="API secret" type="password"
              value={apiSecret} onChange={e => setApiSecret(e.target.value)} autoComplete="new-password" spellCheck={false} />
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !apiKey || !apiSecret}
              className="flex-1 font-semibold py-2.5 rounded-xl text-sm transition-opacity disabled:opacity-50"
              style={{ background: 'var(--green)', color: '#000' }}>
              {saving ? 'Saving…' : 'Save app credentials'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(false); setErr('') }}
                className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                Cancel
              </button>
            )}
          </div>

          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Stored encrypted (AES-256). Only used to log you into your own Zerodha account.
          </p>
        </div>
      )}

      {/* Step 2 — Kite login */}
      {hasApp && !editing && status && (
        <>
          <div className="rounded-xl p-6 mb-6 space-y-5" style={card}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-white text-sm">Kite app</p>
                <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--muted)' }}>
                  {status.has_credentials ? status.api_key_hint : 'Platform app (admin)'}
                </p>
              </div>
              <button onClick={() => setEditing(true)} className="text-xs flex-shrink-0 underline" style={{ color: 'var(--green)' }}>
                {status.has_credentials ? 'Change' : 'Use my own'}
              </button>
            </div>

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

          <button
            onClick={connect}
            disabled={loading}
            className="w-full font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-50"
            style={{ background: 'var(--green)', color: '#000' }}
          >
            {loading ? 'Redirecting to Zerodha…' : 'Connect with Zerodha →'}
          </button>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
            Your Zerodha credentials are entered on Zerodha&apos;s own site — never here.
          </p>
        </>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-lg px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {errorMsg}
        </div>
      )}
    </div>
  )
}
