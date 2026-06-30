import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Page Builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: '100%' }}>{children}</body>
    </html>
  )
}