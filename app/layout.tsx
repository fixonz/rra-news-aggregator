import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CRYPTO NEWS AGGREGATOR',
  description: 'Nickys | CRYPTO NEWS AGGREGATOR',
  generator: '',
  icons: {
    icon: '/placeholder-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
