'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function OrientationCheck({ children }: { children: React.ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(true)

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  if (!isLandscape) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-4 text-center">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rotate_device-bWThSY29JXV7lCiWKPnc58M6p9oDWm.png"
          alt="Rotate device"
          width={120}
          height={120}
          className="mb-4"
        />
        <p className="text-lg">
          โปรดหมุนโทรศัพท์ของท่านเป็นแนวนอนตลอดการใช้งาน
        </p>
      </div>
    )
  }

  return children
}

