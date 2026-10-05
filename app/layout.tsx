import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Varun\'s Portfolio',
  description: 'Portfolio tracker & stock Q&A powered by MiroFish',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} h-full antialiased`}>
        <body className="min-h-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
