import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')

  const isAdmin = (sessionClaims?.metadata as Record<string, unknown>)?.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Nav isAdmin />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}
