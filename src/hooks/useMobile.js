import { useState, useEffect } from 'react'

// ── Détecte si l'app tourne sur mobile (Capacitor ou petit écran) ──
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
      const isSmall     = window.innerWidth <= 768
      setIsMobile(isCapacitor || isSmall)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isMobile
}
