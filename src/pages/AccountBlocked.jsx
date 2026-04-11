import { Link, useLocation } from 'react-router-dom'

export default function AccountBlocked() {
  const { state } = useLocation()
  const email     = state?.email || ''

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      `}</style>

      <div style={{
        minHeight: '100vh', background: 'linear-gradient(135deg,#1A1A2E 0%,#16213E 50%,#0F3460 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{
          background: '#fff', borderRadius: 24, padding: '48px 40px',
          maxWidth: 480, width: '100%', textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)',
          animation: 'fadeUp .5s ease both',
        }}>

          {/* Icône animée */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg,#FEF2F2,#FECACA)',
            border: '3px solid rgba(239,68,68,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: 44,
            animation: 'pulse 2.5s ease-in-out infinite',
          }}>
            🔒
          </div>

          {/* Titre */}
          <h1 style={{
            fontSize: 26, fontWeight: 900, color: '#1A1A1A',
            margin: '0 0 10px', letterSpacing: '-.02em',
          }}>
            Compte bloqué
          </h1>

          <p style={{
            fontSize: 15, color: '#6B7280', lineHeight: 1.7,
            margin: '0 0 28px',
          }}>
            Votre compte{email && <> associé à <strong style={{ color: '#1A1A1A' }}>{email}</strong></>} a été temporairement suspendu par notre équipe de modération.
          </p>

          {/* Raisons possibles */}
          <div style={{
            background: '#FFF9F0', border: '1.5px solid rgba(245,158,11,.25)',
            borderRadius: 14, padding: '18px 20px', marginBottom: 28,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
              Raisons possibles
            </div>
            {[
              'Signalements répétés d\'autres utilisateurs',
              'Non-respect des conditions d\'utilisation',
              'Activité suspecte détectée sur votre compte',
              'Vérification d\'identité requise',
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
                <span style={{ color: '#F59E0B', flexShrink: 0, fontSize: 13 }}>•</span>
                <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{
            background: '#F8FAFC', borderRadius: 14, padding: '16px 20px',
            marginBottom: 28, border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
              Pour contester cette décision ou obtenir plus d'informations, contactez notre support :
            </div>
            <a href="mailto:support@clando.cm" style={{
              display: 'inline-block', marginTop: 10,
              fontSize: 14, fontWeight: 800, color: '#1A9E8A',
              textDecoration: 'none',
            }}>
              📧 support@clando.cm
            </a>
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <a href="mailto:support@clando.cm?subject=Demande de déblocage de compte&body=Bonjour, mon compte est bloqué. Mon adresse email est : " style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'opacity .18s',
              }}>
                Contacter le support
              </button>
            </a>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%', padding: '12px',
                background: 'none', border: '1.5px solid #E2E8F0',
                borderRadius: 12, color: '#6B7280', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ← Retour à l'accueil
              </button>
            </Link>
          </div>

          <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 20 }}>
            Clando · Cameroun — Si votre compte a été bloqué par erreur, nous nous en excusons.
          </p>
        </div>
      </div>
    </>
  )
}
