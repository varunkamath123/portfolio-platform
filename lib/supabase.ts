import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singletons — instantiated on first access so build succeeds without env vars
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _supabase
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _supabaseAdmin
}

function lazyProxy(getter: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      const client = getter()
      const val = (client as unknown as Record<string | symbol, unknown>)[prop]
      return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(client) : val
    },
  })
}

// Convenience re-exports used by API routes and server components
export const supabase      = lazyProxy(getSupabase)
export const supabaseAdmin = lazyProxy(getSupabaseAdmin)

export type UserProfile = {
  id: string
  clerk_user_id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export type FyersCredentials = {
  id: string
  user_id: string
  client_id: string
  api_key_enc: string
  secret_key_enc: string
  access_token_enc: string | null
  token_expiry: string | null
  is_connected: boolean
}

export type TradeRecord = {
  id: string
  user_id: string
  order_id: string
  trade_date: string
  symbol: string
  instrument_type: string | null
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  trade_value: number | null
  pnl: number | null
  charges: number | null
  pnl_after_tax: number | null
  raw_data: Record<string, unknown> | null
  created_at: string
}
