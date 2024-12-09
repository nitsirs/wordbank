import { Sarabun } from 'next/font/google'
import './globals.css'

const sarabun = Sarabun({ 
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sarabun',
})

export const metadata = {
  title: 'Thai Reading Practice',
  description: 'Interactive Thai reading practice application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="font-sans bg-[#F5F6F8] min-h-screen">{children}</body>
    </html>
  )
}

