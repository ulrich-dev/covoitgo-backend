import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ minHeight:'calc(100vh - 68px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 5%', background:'linear-gradient(160deg,#f0fdf8 0%,#faf8f4 100%)' }}>
      <div style={{ fontSize:80, marginBottom:16, animation:'floatY 3s ease-in-out infinite' }}>🚗</div>
      <h1 style={{ fontSize:'clamp(56px,10vw,96px)', fontWeight:800, letterSpacing:'-0.04em', color:'#0f9b7a', marginBottom:8 }}>404</h1>
      <p style={{ fontSize:20, fontWeight:500, color:'#6b635c', marginBottom:8 }}>Oups, cette route n'existe pas !</p>
      <p style={{ fontSize:14, color:'#a09890', marginBottom:32 }}>Le trajet que vous cherchez semble introuvable.</p>
      <Link to="/">
        <button className="btn-primary" style={{ padding:'14px 28px', fontSize:15 }}>← Retour à l'accueil</button>
      </Link>
      <style>{`@keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  )
}
