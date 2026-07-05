import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(n: number, showSign = false): string {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)

  if (showSign && n > 0) return `+${formatted}`
  if (n < 0) return `-${formatted}`
  return formatted
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Token expiry: Fyers tokens expire at midnight IST
export function isFyersTokenValid(tokenExpiry: string | null): boolean {
  if (!tokenExpiry) return false
  return new Date(tokenExpiry) > new Date()
}
