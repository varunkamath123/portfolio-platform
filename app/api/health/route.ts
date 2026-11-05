import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/health — public. One trivial Supabase read; hit daily by the Vercel cron in
// vercel.json so the free-tier project never goes a week without activity (it pauses then).
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('user_profiles').select('id').limit(1)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[health] supabase read failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 })
  }
}
