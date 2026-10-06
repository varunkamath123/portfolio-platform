import Link from 'next/link'

// First-time walkthrough: create a Kite Connect app and link it here.
// Screenshots live in public/guides/kite/. Highlight boxes are % of image size.
// Steps 4-7 have no screenshot yet (need a logged-in developers.kite.trade session).

type Box = { x: number; y: number; w: number; h: number }
type Shot = { src: string; alt: string; highlight?: Box[] }
type Step = { title: string; body: React.ReactNode; shots?: Shot[]; note?: React.ReactNode }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const REDIRECT_URL = `${APP_URL}/api/kite/auth/callback`

const code = 'rounded px-1.5 py-0.5 text-[12px] font-mono text-white break-all'
const codeStyle = { background: 'var(--bg)', border: '1px solid var(--border)' }
const ext = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--green)' }}>{label}</a>
)

const STEPS: Step[] = [
  {
    title: 'Open the Kite Connect developer site and sign up',
    body: <>Go to {ext('https://developers.kite.trade', 'developers.kite.trade')} and click <b className="text-white">Signup</b>. This is a separate developer account from your normal Zerodha login. Use the same email you use with Zerodha.</>,
    shots: [{ src: '/guides/kite/01-login.jpg', alt: 'Kite Connect developer login page', highlight: [{ x: 37.5, y: 64.5, w: 9, h: 6 }] }],
  },
  {
    title: 'Fill in the signup form',
    body: <>Enter your email, name, a password and your phone number. Pick your state.</>,
    shots: [{ src: '/guides/kite/02-signup-top.jpg', alt: 'Kite Connect signup form — personal details' }],
  },
  {
    title: 'Leave IP Whitelist empty, accept the terms, click Signup',
    body: <>The <b className="text-white">IP Whitelist</b> box is only for placing orders through the API. This app only <i>reads</i> your holdings, so leave it empty. Tick <b className="text-white">I agree to the above terms</b> and click <b className="text-white">Signup</b>, then verify your email and log in.</>,
    shots: [{ src: '/guides/kite/03-signup-bottom.jpg', alt: 'Kite Connect signup form — IP whitelist and terms', highlight: [{ x: 27, y: 26, w: 45, h: 14 }, { x: 27, y: 82, w: 45, h: 6 }] }],
  },
  {
    title: 'Create a new app',
    body: <>Once logged in, open <b className="text-white">My apps</b> and click <b className="text-white">Create new app</b>. If you’re offered an app type, the free <b className="text-white">Personal</b> one is enough. This app only reads your holdings.</>,
  },
  {
    title: 'Fill in the app details',
    body: (
      <ul className="list-disc pl-4 space-y-1.5">
        <li><b className="text-white">App name:</b> anything, e.g. <span className={code} style={codeStyle}>Portfolio</span></li>
        <li><b className="text-white">Zerodha Client ID:</b> your Kite user ID (e.g. <span className={code} style={codeStyle}>AB1234</span>). It <u>must</u> be your own. Otherwise Zerodha will say <i>“user is not enabled for this app”</i>.</li>
        <li><b className="text-white">Redirect URL:</b> paste exactly <span className={code} style={codeStyle}>{REDIRECT_URL}</span></li>
        <li><b className="text-white">Postback URL:</b> leave empty</li>
      </ul>
    ),
    note: <>A wrong Redirect URL is the most common mistake. Copy it from here or from the onboarding page. Don’t type it by hand.</>,
  },
  {
    title: 'Copy your API key and API secret',
    body: <>After creating the app, open it. You’ll see the <b className="text-white">API key</b>. Click <b className="text-white">Show API secret</b> to reveal the secret. Keep this page open for the next step.</>,
    note: <>Treat the API secret like a password. Only paste it into this app’s onboarding page, never in chat or email.</>,
  },
  {
    title: 'Paste them into Portfolio and save',
    body: <>Back on the <Link href="/onboarding" className="underline" style={{ color: 'var(--green)' }}>Connect Zerodha</Link> page, paste the API key and API secret and click <b className="text-white">Save app credentials</b>. They are stored encrypted.</>,
  },
  {
    title: 'Connect with Zerodha',
    body: <>Click <b className="text-white">Connect with Zerodha →</b>. You’ll go to Zerodha’s own login page. Log in with your user ID, password and 2FA as usual, and you’ll land on your dashboard.</>,
    shots: [{ src: '/guides/kite/08-kite-login.jpg', alt: 'Zerodha Kite login page' }],
    note: <>Zerodha logs you out of every API app daily at ~6 AM. Each morning the dashboard shows a one-click <b className="text-white">Refresh Kite token</b> button. You only repeat this step, not the whole setup.</>,
  },
]

const TROUBLE: [string, React.ReactNode][] = [
  ['“User is not enabled for this app”', <>The app’s Zerodha Client ID isn’t your user ID, or you saved someone else’s API key. Check the Client ID on your app page, then click <b className="text-white">Change</b> on the onboarding page and re-save your own key.</>],
  ['Zerodha shows a redirect / invalid URL error', <>The Redirect URL in your Kite app doesn’t exactly match <span className={code} style={codeStyle}>{REDIRECT_URL}</span>. Edit the app on developers.kite.trade and fix it.</>],
  ['“Token exchange failed”', <>The API secret is wrong (often a missing character when copying). Re-copy it and save again.</>],
  ['Dashboard says token expired', <>Normal. It happens every morning. Click <b className="text-white">Refresh Kite token</b>.</>],
]

function Screenshot({ shot }: { shot: Shot }) {
  return (
    <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.src} alt={shot.alt} className="block w-full h-auto" loading="lazy" />
      {shot.highlight?.map((b, i) => (
        <div key={i} className="absolute rounded-md pointer-events-none"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`,
            border: '3px solid var(--green)', boxShadow: '0 0 0 3px rgba(22,199,132,0.25)' }} />
      ))}
    </div>
  )
}

export default function KiteGuidePage() {
  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 pb-20">
      <Link href="/onboarding" className="text-xs" style={{ color: 'var(--muted)' }}>← Back to Connect Zerodha</Link>

      <h1 className="text-2xl font-bold text-white mt-4">Set up your Zerodha connection</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
        One-time setup, about 5 minutes. Zerodha only lets an API app read the account that created it,
        so you create your own free Kite Connect app and link it here.
      </p>

      <ol className="mt-8 space-y-6">
        {STEPS.map((s, i) => (
          <li key={i} className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black"
                style={{ background: 'var(--green)' }}>{i + 1}</div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-white text-sm leading-7">{s.title}</h2>
                <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{s.body}</div>
              </div>
            </div>
            {s.shots && <div className="mt-4 space-y-3">{s.shots.map(sh => <Screenshot key={sh.src} shot={sh} />)}</div>}
            {s.note && (
              <p className="text-xs mt-3 rounded-lg px-3 py-2" style={{ background: 'rgba(22,199,132,0.08)', border: '1px solid rgba(22,199,132,0.2)', color: '#b6dcb6' }}>
                {s.note}
              </p>
            )}
          </li>
        ))}
      </ol>

      <h2 className="text-lg font-semibold text-white mt-12 mb-4">Troubleshooting</h2>
      <div className="space-y-3">
        {TROUBLE.map(([q, a]) => (
          <div key={q} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium text-white">{q}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{a}</p>
          </div>
        ))}
      </div>

      <Link href="/onboarding"
        className="block text-center w-full font-semibold py-3 rounded-xl text-sm mt-10"
        style={{ background: 'var(--green)', color: '#000' }}>
        I’m ready, take me to Connect Zerodha →
      </Link>
    </div>
  )
}
