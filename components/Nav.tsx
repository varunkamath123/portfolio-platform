'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const userLinks = [
  { href: '/dashboard', label: 'Portfolio' },
  { href: '/ask',       label: 'Research' },
]

const adminLinks = [
  { href: '/admin', label: 'Users' },
]

export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname()

  return (
    <nav style={{ background: '#0a100a', borderBottom: '1px solid var(--border)' }} className="sticky top-0 z-10 px-4">
      <div className="max-w-6xl mx-auto flex items-center h-14 gap-6">
        <Link href="/dashboard" className="font-bold text-sm tracking-tight" style={{ color: 'var(--green)' }}>
          ◈ Portfolio
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {userLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                path === l.href || (l.href === '/dashboard' && path === '/')
                  ? 'font-semibold'
                  : ''
              )}
              style={{
                color: (path === l.href || (l.href === '/dashboard' && path === '/'))
                  ? 'var(--green)'
                  : 'var(--muted)',
                background: (path === l.href || (l.href === '/dashboard' && path === '/'))
                  ? 'rgba(22,199,132,0.08)'
                  : 'transparent',
              }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && adminLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{ color: path.startsWith('/admin') ? 'var(--green)' : 'var(--muted)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <UserButton />
      </div>
    </nav>
  )
}
