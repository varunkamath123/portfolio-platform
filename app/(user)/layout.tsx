import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Nav } from '@/components/Nav'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')

  const isAdmin = (sessionClaims?.metadata as Record<string, unknown>)?.role === 'admin'

  // Upsert profile then read back to check is_active
  await supabaseAdmin
    .from('user_profiles')
    .upsert({ clerk_user_id: userId }, { onConflict: 'clerk_user_id', ignoreDuplicates: true })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('is_active')
    .eq('clerk_user_id', userId)
    .single()

  if (profile && profile.is_active === false) redirect('/blocked')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Nav isAdmin={isAdmin} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  )
}
