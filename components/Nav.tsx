'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const userLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trades',    label: 'Trades' },
]

const adminLinks = [
  { href: '/admin',     label: 'Users' },
]

export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname()

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4">
      <div className="max-w-6xl mx-auto flex items-center h-14 gap-6">
        <span className="font-semibold text-gray-900 text-sm tracking-tight">FnO Dashboard</span>

        <div className="flex items-center gap-1 flex-1">
          {userLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                path === l.href
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && adminLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                path.startsWith('/admin')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              )}
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
