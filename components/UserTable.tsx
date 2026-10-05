'use client'
import { useState } from 'react'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
  kite_connected: boolean
  question_count: number
  created_at: string
}

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function ConfirmModal({
  user, action, onConfirm, onCancel,
}: {
  user: AdminUser
  action: 'block' | 'unblock'
  onConfirm: () => void
  onCancel: () => void
}) {
  const isBlock = action === 'block'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onCancel}>
      <div className="rounded-2xl p-6 w-full max-w-sm space-y-4"
        style={{ ...cardStyle, background: '#0f1a0f' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: isBlock ? 'rgba(248,113,113,0.12)' : 'rgba(22,199,132,0.12)',
              border: `1px solid ${isBlock ? 'rgba(248,113,113,0.3)' : 'rgba(22,199,132,0.3)'}`,
            }}>
            {isBlock ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16c784" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold text-white">
              {isBlock ? 'Block user?' : 'Unblock user?'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {user.full_name ?? user.email}
            </p>
          </div>
        </div>
        <p className="text-sm" style={{ color: '#c8dfc8' }}>
          {isBlock
            ? 'This user will immediately lose access to the platform and see a suspended page.'
            : 'This user will regain full access to the platform immediately.'}
        </p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-lg"
            style={{
              background: isBlock ? '#991b1b' : 'var(--green)',
              color: isBlock ? 'white' : '#000',
            }}>
            {isBlock ? 'Block' : 'Unblock'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function UserTable({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: 'block' | 'unblock' } | null>(null)

  async function handleToggle(user: AdminUser) {
    setConfirm({ user, action: user.is_active ? 'block' : 'unblock' })
  }

  async function confirmToggle() {
    if (!confirm) return
    const { user } = confirm
    const newActive = !user.is_active
    setConfirm(null)
    setLoading(user.id)

    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, is_active: newActive }),
    })

    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newActive } : u))
    setLoading(null)
  }

  return (
    <>
      {confirm && (
        <ConfirmModal
          user={confirm.user}
          action={confirm.action}
          onConfirm={confirmToggle}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="rounded-xl overflow-x-auto" style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-center">Kite</th>
              <th className="px-4 py-3 text-center">Questions</th>
              <th className="px-4 py-3 text-center">Joined</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}
                style={{
                  borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: u.is_active ? 1 : 0.55,
                }}>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{u.full_name ?? u.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{u.email}</p>
                  {u.is_admin && (
                    <span className="text-xs mt-0.5 inline-block px-1.5 py-0.5 rounded font-medium"
                      style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>Admin</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium`}
                    style={{ color: u.kite_connected ? 'var(--green)' : 'var(--muted)' }}>
                    {u.kite_connected ? '● Connected' : '○ Not linked'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-white">{u.question_count}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span style={{ color: 'var(--muted)' }}>{timeAgo(u.created_at)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: u.is_active ? 'rgba(22,199,132,0.12)' : 'rgba(248,113,113,0.12)',
                      color: u.is_active ? 'var(--green)' : '#f87171',
                    }}>
                    {u.is_active ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {!u.is_admin && (
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={loading === u.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40"
                      style={{
                        background: u.is_active ? 'rgba(248,113,113,0.1)' : 'rgba(22,199,132,0.1)',
                        color: u.is_active ? '#f87171' : 'var(--green)',
                        border: `1px solid ${u.is_active ? 'rgba(248,113,113,0.2)' : 'rgba(22,199,132,0.2)'}`,
                      }}
                    >
                      {loading === u.id ? '…' : u.is_active ? 'Block' : 'Unblock'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
