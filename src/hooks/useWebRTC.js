import { useState, useEffect, useRef, useCallback } from 'react'

// Serveurs STUN gratuits (Google + Cloudflare)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
}

// ═══════════════════════════════════════════════════════════
//  useWebRTC — Hook WebRTC natif pour appel vocal P2P
//
//  Usage :
//    const call = useWebRTC({ socket, bookingId, user })
//    call.startCall(otherName)   — démarrer un appel
//    call.acceptCall()           — accepter un appel entrant
//    call.endCall()              — terminer l'appel
//    call.toggleMute()           — couper/rétablir le micro
// ═══════════════════════════════════════════════════════════
export function useWebRTC({ socket, bookingId, user }) {

  const [callState, setCallState] = useState({
    status:    'idle',       // idle | calling | incoming | connected | ended | error
    otherName: '',
    duration:  0,
    muted:     false,
    error:     '',
  })

  const pcRef         = useRef(null)   // RTCPeerConnection
  const localStreamRef = useRef(null)  // MediaStream micro local
  const timerRef      = useRef(null)   // Timer durée appel
  const isCallerRef   = useRef(false)  // Suis-je l'appelant ?

  // ── Nettoyer proprement ───────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(timerRef.current)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
  }, [])

  // ── Créer la PeerConnection ───────────────────────────────
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Envoyer les ICE candidates à l'autre
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('call:ice', { bookingId, candidate })
      }
    }

    // Recevoir l'audio de l'autre
    pc.ontrack = (event) => {
      const audio = new Audio()
      audio.srcObject = event.streams[0]
      audio.play().catch(() => {})
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState(s => ({ ...s, status: 'connected' }))
        timerRef.current = setInterval(() => {
          setCallState(s => ({ ...s, duration: s.duration + 1 }))
        }, 1000)
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall()
      }
    }

    pcRef.current = pc
    return pc
  }, [bookingId, socket])

  // ── Obtenir le micro ──────────────────────────────────────
  const getMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      })
      localStreamRef.current = stream
      return stream
    } catch {
      throw new Error('Impossible d\'accéder au microphone. Vérifiez les permissions.')
    }
  }, [])

  // ── Démarrer un appel ─────────────────────────────────────
  const startCall = useCallback(async (otherName) => {
    if (!socket || !bookingId) return
    setCallState(s => ({ ...s, status: 'calling', otherName, duration: 0 }))
    isCallerRef.current = true

    try {
      const stream = await getMic()
      const pc = createPC()

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Créer l'offre SDP
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)

      // Notifier l'autre + envoyer l'offre
      socket.emit('call:start', { bookingId, callerName: user?.firstName || 'Appelant' })
      socket.emit('call:offer',  { bookingId, offer })
    } catch (err) {
      setCallState(s => ({ ...s, status: 'error', error: err.message }))
      cleanup()
    }
  }, [socket, bookingId, user, getMic, createPC, cleanup])

  // ── Accepter un appel entrant ─────────────────────────────
  const acceptCall = useCallback(async (incomingOffer) => {
    if (!socket || !pcRef.current) return
    setCallState(s => ({ ...s, status: 'connecting' }))

    try {
      const stream = await getMic()
      const pc = pcRef.current

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Répondre à l'offre
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit('call:answer', { bookingId, answer })
      socket.emit('call:accept', { bookingId, callLogId: callLogIdRef.current })
    } catch (err) {
      setCallState(s => ({ ...s, status: 'error', error: err.message }))
      cleanup()
    }
  }, [socket, bookingId, getMic, cleanup])

  const callLogIdRef = useRef(null)

  // ── Terminer l'appel ─────────────────────────────────────
  const endCall = useCallback((reason) => {
    if (socket && bookingId) {
      socket.emit('call:end', {
        bookingId,
        reason: reason || 'ended',
        callLogId: callLogIdRef.current,
        duration: callState.duration,
      })
    }
    cleanup()
    setCallState(s => ({ ...s, status: 'ended' }))
    setTimeout(() => setCallState(s => ({ ...s, status: 'idle', duration: 0 })), 2000)
  }, [socket, bookingId, callState.duration, cleanup])

  // ── Mute/Unmute ───────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const enabled = localStreamRef.current.getAudioTracks()[0]?.enabled
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !enabled })
      setCallState(s => ({ ...s, muted: !s.muted }))
    }
  }, [])

  // ── Écouter les événements Socket.io ─────────────────────
  useEffect(() => {
    if (!socket) return

    // Appel entrant
    const onIncoming = ({ callerName, callLogId }) => {
      const pc = createPC()
      pcRef.current = pc
      callLogIdRef.current = callLogId
      setCallState(s => ({ ...s, status: 'incoming', otherName: callerName }))
    }

    // Recevoir l'offre SDP
    const onOffer = async ({ offer }) => {
      if (!pcRef.current) {
        const pc = createPC()
        pcRef.current = pc
      }
      // Stocker l'offre pour l'accepter quand l'utilisateur clique
      pcRef.current._pendingOffer = offer
    }

    // Recevoir la réponse SDP (côté appelant)
    const onAnswer = async ({ answer }) => {
      try {
        if (pcRef.current?.signalingState !== 'stable') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        }
      } catch (err) {
        console.error('call:answer error:', err)
      }
    }

    // Recevoir un ICE candidate
    const onIce = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
      } catch {}
    }

    // Appel accepté par l'autre
    const onAccepted = () => {
      setCallState(s => ({ ...s, status: 'connecting' }))
    }

    // Appel terminé/refusé
    const onEnded = ({ reason }) => {
      cleanup()
      setCallState(s => ({
        ...s,
        status: 'ended',
        error: reason === 'rejected' ? 'Appel refusé' : '',
      }))
      setTimeout(() => setCallState(s => ({ ...s, status: 'idle' })), 2000)
    }

    socket.on('call:incoming', onIncoming)
    socket.on('call:offer',    onOffer)
    socket.on('call:answer',   onAnswer)
    socket.on('call:ice',      onIce)
    socket.on('call:accepted', onAccepted)
    socket.on('call:ended',    onEnded)

    return () => {
      socket.off('call:incoming', onIncoming)
      socket.off('call:offer',    onOffer)
      socket.off('call:answer',   onAnswer)
      socket.off('call:ice',      onIce)
      socket.off('call:accepted', onAccepted)
      socket.off('call:ended',    onEnded)
    }
  }, [socket, createPC, cleanup])

  // Cleanup au démontage
  useEffect(() => () => cleanup(), [cleanup])

  // ── Wrapper acceptCall qui récupère l'offre en attente ────
  const handleAccept = useCallback(() => {
    const offer = pcRef.current?._pendingOffer
    if (offer) acceptCall(offer)
  }, [acceptCall])

  return {
    callState,
    startCall,
    acceptCall: handleAccept,
    endCall,
    toggleMute,
  }
}
