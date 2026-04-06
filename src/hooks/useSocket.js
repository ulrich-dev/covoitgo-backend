import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

// Instance socket partagée (singleton)
let socketInstance = null

function getSocket() {
  if (!socketInstance) {
    socketInstance = io({            // même origine → proxy Vite forward vers :5000
      withCredentials: true,
      autoConnect:     false,
      reconnection:    true,
      reconnectionDelay:       1000,
      reconnectionAttempts:    10,
      transports: ['websocket', 'polling'],
    })
  }
  return socketInstance
}

/**
 * useSocket(user)
 * Connecte / déconnecte le socket selon l'état de l'utilisateur.
 *
 * Retourne :
 *   socket     — l'instance Socket.io
 *   on         — abonner un événement (nettoyé automatiquement au démontage)
 *   emit       — émettre un événement
 *   joinConv   — rejoindre une salle de conversation
 *   leaveConv  — quitter une salle
 */
export function useSocket(user) {
  const socket     = getSocket()
  const listenersRef = useRef([])

  // Connecter/déconnecter selon l'utilisateur
  useEffect(() => {
    if (user && !socket.connected) {
      socket.connect()
    }
    if (!user && socket.connected) {
      socket.disconnect()
    }
    return () => {
      // Ne pas déconnecter au démontage (le socket reste global)
    }
  }, [user])

  // Abonner un événement — nettoyage automatique au démontage du composant
  const on = useCallback((event, handler) => {
    socket.on(event, handler)
    listenersRef.current.push({ event, handler })
  }, [socket])

  // Nettoyer les listeners au démontage
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler)
      })
      listenersRef.current = []
    }
  }, [socket])

  const emit      = useCallback((ev, data) => socket.emit(ev, data), [socket])
  const joinConv  = useCallback((bookingId) => socket.emit('join_conversation', { bookingId }), [socket])
  const leaveConv = useCallback((bookingId) => socket.emit('leave_conversation', { bookingId }), [socket])

  return { socket, on, emit, joinConv, leaveConv }
}
