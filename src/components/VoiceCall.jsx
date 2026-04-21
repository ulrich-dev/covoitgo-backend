import { useEffect } from 'react'

// ════════════════════════════════════════════════════════════
//  VoiceCall — Interface d'appel vocal style WhatsApp
//  Props:
//    callState   — état de useWebRTC (status, otherName, duration, muted)
//    onAccept    — accepter l'appel entrant
//    onEnd       — terminer / refuser l'appel
//    onMute      — toggle mute
//    avatarColor — couleur de l'avatar
// ════════════════════════════════════════════════════════════
export default function VoiceCall({ callState, onAccept, onEnd, onMute, avatarColor = '#1A9E8A' }) {
  const { status, otherName, duration, muted, error } = callState

  // Son de sonnerie (appel entrant)
  useEffect(() => {
    if (status !== 'incoming') return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    let stopped = false

    const ring = () => {
      if (stopped) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
      if (!stopped) setTimeout(ring, 1200)
    }

    ring()
    return () => {
      stopped = true
      ctx.close()
    }
  }, [status])

  const fmtDuration = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const initial = (otherName || '?')[0]?.toUpperCase() || '?'

  const statusLabel = {
    calling:    'Appel en cours…',
    incoming:   'Appel entrant',
    connecting: 'Connexion…',
    connected:  fmtDuration(duration),
    ended:      error || 'Appel terminé',
    error:      error || 'Erreur',
    idle:       '',
  }[status] || ''

  return (
    <>
      <style>{`
        @keyframes callPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(26,158,138,.6)} 70%{box-shadow:0 0 0 20px rgba(26,158,138,0)} }
        @keyframes callRing   { 0%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)} 60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)} 100%{transform:rotate(0)} }
        @keyframes callFadeIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        .call-overlay { position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(16px);animation:callFadeIn .3s ease; }
        .call-card { background:linear-gradient(160deg,#1A2830,#0D1A1A);border-radius:32px;padding:48px 40px 40px;width:320px;text-align:center;border:1px solid rgba(255,255,255,.08); }
        .call-avatar { width:100px;height:100px;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:900;color:#fff; }
        .call-avatar.pulse { animation:callPulse 1.5s infinite; }
        .call-name   { color:#fff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-.02em; }
        .call-status { color:rgba(255,255,255,.45);font-size:15px;margin:0 0 40px;font-variant-numeric:tabular-nums; }
        .call-btn-row { display:flex;gap:24px;justify-content:center;align-items:center; }
        .call-btn { width:68px;height:68px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:26px;transition:transform .12s,filter .12s;outline:none; }
        .call-btn:hover { filter:brightness(1.15); }
        .call-btn:active { transform:scale(.9); }
        .call-btn-sm { width:52px;height:52px;font-size:20px; }
        .call-btn-end { background:linear-gradient(135deg,#EF4444,#DC2626); }
        .call-btn-accept { background:linear-gradient(135deg,#1A9E8A,#22C6AD);animation:callRing 1s ease infinite; }
        .call-btn-mute  { background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15); }
        .call-btn-mute.active { background:rgba(239,68,68,.25);border-color:rgba(239,68,68,.4); }
        .call-label { color:rgba(255,255,255,.4);font-size:12px;margin-top:10px;font-weight:600; }
      `}</style>

      <div className="call-overlay">
        <div className="call-card">

          {/* Avatar */}
          <div
            className={`call-avatar${status==='calling'||status==='incoming'?' pulse':''}`}
            style={{ background: avatarColor }}
          >
            {initial}
          </div>

          {/* Nom */}
          <p className="call-name">{otherName || 'Correspondant'}</p>

          {/* Statut */}
          <p className="call-status">{statusLabel}</p>

          {/* Boutons — Appel entrant */}
          {status === 'incoming' && (
            <div className="call-btn-row">
              <div>
                <button className="call-btn call-btn-end" onClick={onEnd} title="Refuser">
                  📵
                </button>
                <p className="call-label">Refuser</p>
              </div>
              <div>
                <button className="call-btn call-btn-accept" onClick={onAccept} title="Accepter">
                  📞
                </button>
                <p className="call-label">Accepter</p>
              </div>
            </div>
          )}

          {/* Boutons — En appel */}
          {(status === 'calling' || status === 'connecting' || status === 'connected') && (
            <div className="call-btn-row">
              <div>
                <button
                  className={`call-btn call-btn-sm call-btn-mute${muted?' active':''}`}
                  onClick={onMute}
                  title={muted ? 'Activer le micro' : 'Couper le micro'}
                >
                  {muted ? '🔇' : '🎤'}
                </button>
                <p className="call-label">{muted ? 'Réactiver' : 'Micro'}</p>
              </div>
              <div>
                <button className="call-btn call-btn-end" onClick={onEnd} title="Raccrocher">
                  📵
                </button>
                <p className="call-label">Raccrocher</p>
              </div>
              <div>
                <button
                  className="call-btn call-btn-sm call-btn-mute"
                  title="Haut-parleur (auto)"
                  style={{ cursor: 'default', opacity: .5 }}
                >
                  🔊
                </button>
                <p className="call-label">HP</p>
              </div>
            </div>
          )}

          {/* Terminé */}
          {(status === 'ended' || status === 'error') && (
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, marginTop: 8 }}>
              {status === 'error' ? '❌ ' : ''}
              {error || 'Appel terminé'}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
