import { useEffect } from 'react'

// ══════════════════════════════════════════════════════════════
//  useTripNotifications — Programme les notifs locales
//  Utilise @capacitor/local-notifications sur Android, fallback web
// ══════════════════════════════════════════════════════════════

export function useTripNotifications(bookings) {
  useEffect(() => {
    if (!bookings?.length) return

    (async () => {
      const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

      if (isNative) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          await LocalNotifications.requestPermissions()

          const notifications = []
          bookings.forEach((b, idx) => {
            if (b.status !== 'confirmed') return
            const depTime = new Date(b.departure_time).getTime()
            const now     = Date.now()
            if (depTime < now) return

            // Notif 1h avant
            if (depTime - now > 3600000) {
              notifications.push({
                id: idx * 100 + 1,
                title: '🕐 Trajet dans 1h',
                body:  `${b.origin_city} → ${b.destination_city}`,
                schedule: { at: new Date(depTime - 3600000) },
                extra: { bookingId: b.id },
              })
            }

            // Notif 15min avant
            if (depTime - now > 900000) {
              notifications.push({
                id: idx * 100 + 2,
                title: '⏰ Trajet dans 15 min !',
                body:  `Préparez-vous : ${b.origin_city} → ${b.destination_city}`,
                schedule: { at: new Date(depTime - 900000) },
                extra: { bookingId: b.id },
              })
            }

            // Notif à l'heure pile
            notifications.push({
              id: idx * 100 + 3,
              title: "🚗 C'est l'heure du trajet !",
              body:  `Démarrez votre trajet ${b.origin_city} → ${b.destination_city}`,
              schedule: { at: new Date(depTime) },
              extra: { bookingId: b.id, action: 'start_trip' },
            })
          })

          if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications })
          }
        } catch (e) {
          console.warn('LocalNotifications indisponible:', e)
        }
      } else if (typeof Notification !== 'undefined') {
        // Fallback web : demander permission
        if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
        // Timers pour déclencher les popups (voir TripStartPopup ci-dessous)
      }
    })()
  }, [bookings])
}
