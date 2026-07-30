import { Sarabun } from 'next/font/google'
import './globals.css'

const sarabun = Sarabun({ 
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sarabun',
})

export const metadata = {
  title: 'บัญชีคำ',
  description: 'แบบฝึกอ่านออกเสียงและสะกดคำ สำหรับนักเรียนชั้น ป.1',
  metadataBase: new URL('https://arnork.com'),
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

