export default function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#080c08' }}>
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </svg>
        </div>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'white' }}>Account Suspended</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#6b8f6b' }}>
          Your access to this platform has been suspended by an administrator.
          If you believe this is an error, please reach out to get it resolved.
        </p>
      </div>
    </div>
  )
}
