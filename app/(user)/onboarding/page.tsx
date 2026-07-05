'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ client_id: '', api_key: '', secret_key: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/users/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save credentials')
      setLoading(false)
      return
    }

    // After saving credentials, redirect to Fyers OAuth
    const authRes  = await fetch('/api/fyers/auth/url')
    const authData = await authRes.json()
    if (authData.url) {
      window.location.href = authData.url
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Connect your Fyers account</h1>
      <p className="text-sm text-gray-500 mb-8">
        Your API credentials are AES-256 encrypted before storage and never exposed to the browser.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Client ID"
          placeholder="e.g. XY12345"
          value={form.client_id}
          onChange={v => setForm(f => ({ ...f, client_id: v }))}
        />
        <Field
          label="App ID (API Key)"
          placeholder="Your Fyers App ID"
          value={form.api_key}
          onChange={v => setForm(f => ({ ...f, api_key: v }))}
        />
        <Field
          label="Secret Key"
          placeholder="Your Fyers App Secret"
          value={form.secret_key}
          onChange={v => setForm(f => ({ ...f, secret_key: v }))}
          type="password"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving & redirecting to Fyers…' : 'Save & Connect'}
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 space-y-1">
        <p className="font-medium">How to get your Fyers API credentials:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Log in to myapi.fyers.in</li>
          <li>Create a new app — set redirect URI to: <code className="bg-blue-100 px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL}/api/fyers/auth/callback</code></li>
          <li>Copy the App ID and Secret Key from the app dashboard</li>
        </ol>
      </div>
    </div>
  )
}

function Field({
  label, placeholder, value, onChange, type = 'text',
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}
