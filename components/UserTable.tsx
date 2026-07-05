'use client'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { FyersBalance } from '@/lib/fyers'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
  connected: boolean
  balance: FyersBalance | null
  created_at: string
}

export function UserTable({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  async function toggleActive(user: AdminUser) {
    setLoading(user.id)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, is_active: !user.is_active }),
    })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    setLoading(null)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-center">Fyers</th>
            <th className="px-4 py-3 text-right">Total Balance</th>
            <th className="px-4 py-3 text-right">Available</th>
            <th className="px-4 py-3 text-right">Used Margin</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{u.full_name ?? u.email}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-medium ${u.connected ? 'text-green-600' : 'text-gray-400'}`}>
                  {u.connected ? 'Connected' : 'Not linked'}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {u.balance ? formatCurrency(u.balance.total_balance) : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-green-700">
                {u.balance ? formatCurrency(u.balance.available_margin) : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                {u.balance ? formatCurrency(u.balance.used_margin) : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                  ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => toggleActive(u)}
                  disabled={loading === u.id}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
                >
                  {loading === u.id ? '…' : u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
