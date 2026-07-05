import { FyersConnectBanner } from '@/components/FyersConnectBanner'

export default function ConnectFyersPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMap: Record<string, string> = {
    missing_params:  'Missing code or state in the OAuth response.',
    user_not_found:  'Your user profile was not found. Please contact support.',
    no_credentials:  'Fyers credentials not configured. Go to onboarding first.',
    token_exchange:  'Token exchange failed. Please try again.',
  }
  const errorMsg = searchParams.error ? errorMap[searchParams.error] : null

  return (
    <div className="max-w-md mx-auto mt-12 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Daily Fyers Re-auth</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fyers access tokens expire every day at midnight. Click below to re-authenticate.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <FyersConnectBanner expired />
    </div>
  )
}
