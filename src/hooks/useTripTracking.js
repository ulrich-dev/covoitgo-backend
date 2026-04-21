import { useState, useEffect, useRef, useCallback } from 'react'
import { API_URL, authFetch } from '../utils/api'

// ══════════════════════════════════════════════════════════════
//  useTripTracking — Hook de suivi GPS temps réel
// ══════════════════════════════════════════════════════════════

export function useTripTracking({ bookingId, socket, isDriver, enabled }) {
  const [position, setPosition]       = useState(null)
  const [otherPosition, setOtherPos]  = useState(null)
  const [progress, setProgress]       = useState(0)
  const [status, setStatus]           = useState('not_started')
  const [showMidTrip, setShowMidTrip] = useState(false)
  const [showArrived, setShowArrived] = useState(false)
  const [error, setError]             = useState('')

  const watchIdRef = useRef(null)
  const lastSentRef = useRef(0)

  // ── Démarrer le tracking GPS (foreground + background) ───────
  const startTracking = useCallback(async () => {
    if (!enabled) return

    try {
      // Marquer le trajet comme démarré côté serveur
      await authFetch(`${API_URL}/api/tracking/${bookingId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      setStatus('in_progress')

      // Capacitor natif : utiliser @capacitor/geolocation
      const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

      if (isNative) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation')
          const permResult = await Geolocation.requestPermissions()
          if (permResult.location === 'denied') {
            setError('Permission GPS refusée')
            return
          }

          const watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000 },
            (pos, err) => {
              if (err) { console.warn('GPS error', err); return }
              handlePosition(pos)
            }
          )
          watchIdRef.current = watchId
        } catch (e) {
          console.warn('Capacitor Geolocation unavailable, falling back to browser')
          useBrowserGeolocation()
        }
      } else {
        useBrowserGeolocation()
      }
    } catch (err) {
      setError('Impossible de démarrer le suivi')
      console.error(err)
    }
  }, [bookingId, enabled])

  const useBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non disponible')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn('GPS', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // ── Traiter une nouvelle position ─────────────────────────────
  const handlePosition = useCallback(async (pos) => {
    const { latitude, longitude, heading, speed, accuracy } = pos.coords
    setPosition({ latitude, longitude, heading, speed, accuracy, timestamp: Date.now() })

    // Throttle : envoyer au serveur toutes les 10 secondes max
    const now = Date.now()
    if (now - lastSentRef.current < 10000) return
    lastSentRef.current = now

    try {
      const res  = await authFetch(`${API_URL}/api/tracking/${bookingId}/position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude, longitude,
          heading: heading || null,
          speed:   speed ? speed * 3.6 : null, // m/s → km/h
          accuracy,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setProgress(data.progress || 0)
        if (data.midTripReached) setShowMidTrip(true)
        if (data.arrived)        { setShowArrived(true); setStatus('arrived') }
      }
    } catch {}
  }, [bookingId])

  // ── Arrêter le tracking ──────────────────────────────────────
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
      if (isNative) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation')
          await Geolocation.clearWatch({ id: watchIdRef.current })
        } catch {}
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }
  }, [])

  // ── Terminer le trajet ───────────────────────────────────────
  const endTrip = useCallback(async () => {
    await stopTracking()
    try {
      await authFetch(`${API_URL}/api/tracking/${bookingId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      setStatus('completed')
    } catch {}
  }, [bookingId, stopTracking])

  // ── Écouter les événements Socket.io de l'autre participant ──
  useEffect(() => {
    if (!socket) return

    const onPos = (data) => {
      if (data.bookingId !== bookingId) return
      // Ne pas afficher sa propre position (on l'a déjà)
      if ((isDriver && data.role === 'driver') || (!isDriver && data.role === 'passenger')) return
      setOtherPos({
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
      })
      if (data.progress !== undefined) setProgress(data.progress)
    }

    const onMid    = () => setShowMidTrip(true)
    const onArr    = () => { setShowArrived(true); setStatus('arrived') }
    const onDone   = () => setStatus('completed')
    const onStart  = () => setStatus('in_progress')

    socket.on('trip:position',  onPos)
    socket.on('trip:mid',       onMid)
    socket.on('trip:arrived',   onArr)
    socket.on('trip:completed', onDone)
    socket.on('trip:started',   onStart)

    return () => {
      socket.off('trip:position',  onPos)
      socket.off('trip:mid',       onMid)
      socket.off('trip:arrived',   onArr)
      socket.off('trip:completed', onDone)
      socket.off('trip:started',   onStart)
    }
  }, [socket, bookingId, isDriver])

  // Cleanup
  useEffect(() => () => { stopTracking() }, [stopTracking])

  return {
    position, otherPosition, progress, status, error,
    showMidTrip, showArrived,
    startTracking, stopTracking, endTrip,
    dismissMidTrip: () => setShowMidTrip(false),
    dismissArrived: () => setShowArrived(false),
  }
}
