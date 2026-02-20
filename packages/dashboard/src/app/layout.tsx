import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FraudShield Dashboard',
  description: 'Monitor and manage fraud detection for your applications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
