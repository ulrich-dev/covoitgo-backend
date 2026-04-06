import { Link } from 'react-router-dom'
import { useLang } from '../../context/LangContext'

export default function Footer() {
  const { t, lang, toggleLang } = useLang()
  const year = new Date().getFullYear()

  const COLS = [
    {
      key: 'product',
      links: [
        { label: t.footer.links.search,   to: '/search' },
        { label: t.footer.links.publish,  to: '/publish' },
        { label: t.footer.links.messages, to: '/messages' },
      ],
    },
    {
      key: 'company',
      links: [
        { label: t.footer.links.about,   to: '#' },
        { label: t.footer.links.blog,    to: '#' },
        { label: t.footer.links.press,   to: '#' },
        { label: t.footer.links.careers, to: '#' },
        { label: 'Contact',              to: '/contact' },
      ],
    },
    {
      key: 'legal',
      links: [
        { label: t.footer.links.terms,   to: '/terms' },
        { label: t.footer.links.privacy, to: '/privacy' },
        { label: t.footer.links.cookies, to: '#' },
      ],
    },
  ]

  return (
    <>
      <style>{`
        .cvg-footer { background:#111; color:#888; font-family:'Plus Jakarta Sans',sans-serif; }
        .cvg-footer a { color:#888; text-decoration:none; font-size:13.5px; transition:color .18s; }
        .cvg-footer a:hover { color:#1A9E8A; }
        .footer-inner { max-width:1200px; margin:0 auto; padding:56px 28px 36px; }
        .footer-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:44px; }
        .footer-col-title { font-size:11px; font-weight:800; color:#fff; letter-spacing:.1em; text-transform:uppercase; margin-bottom:18px; }
        .footer-links { display:flex; flex-direction:column; gap:11px; }
        .footer-bottom { border-top:1px solid rgba(255,255,255,0.07); margin-top:48px; padding-top:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .footer-social-btn {
          width:36px; height:36px; border-radius:9px;
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
          cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center;
          transition:background .2s;
        }
        .footer-social-btn:hover { background:rgba(26,158,138,0.25); }
        .footer-lang-toggle {
          display:inline-flex; align-items:center; gap:8px;
          padding:7px 14px; border-radius:20px;
          border:1px solid rgba(255,255,255,0.15); background:transparent;
          color:#aaa; font-size:13px; font-weight:600;
          cursor:pointer; font-family:inherit; transition:all .18s;
        }
        .footer-lang-toggle:hover { border-color:#1A9E8A; color:#1A9E8A; }
        @media(max-width:900px) {
          .footer-grid { grid-template-columns:1fr 1fr; gap:28px; }
          .footer-inner { padding:40px 18px 28px; }
        }
        @media(max-width:520px) {
          .footer-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <footer className="cvg-footer">
        <div className="footer-inner">
          <div className="footer-grid">

            {/* ── Brand column ── */}
            <div>
              <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, marginBottom:16 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🚗</div>
                <span style={{ fontWeight:800, fontSize:18, color:'#fff', letterSpacing:'-0.04em' }}>Covoit<span style={{ color:'#1A9E8A' }}>go</span></span>
              </Link>
              <p style={{ fontSize:13.5, lineHeight:1.8, marginBottom:22, maxWidth:230, fontWeight:400 }}>
                {t.footer.tagline}
              </p>

              {/* Socials */}
              <div style={{ display:'flex', gap:8, marginBottom:22 }}>
                {['𝕏', 'f', '📸', '▶'].map((ic, i) => (
                  <button key={i} className="footer-social-btn">{ic}</button>
                ))}
              </div>

              {/* Language toggle */}
              <button className="footer-lang-toggle" onClick={toggleLang}>
                {lang === 'fr' ? '🇬🇧 English' : '🇫🇷 Français'}
              </button>
            </div>

            {/* ── Link columns ── */}
            {COLS.map(col => (
              <div key={col.key}>
                <div className="footer-col-title">{t.footer[col.key]}</div>
                <div className="footer-links">
                  {col.links.map(link => (
                    <Link key={link.label} to={link.to}>{link.label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Bottom bar ── */}
          <div className="footer-bottom">
            <span style={{ fontSize:13 }}>{t.footer.copyright(year)}</span>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:12, background:'rgba(26,158,138,0.18)', color:'#22C6AD', borderRadius:6, padding:'3px 10px', fontWeight:600 }}>
                🌿 {lang === 'fr' ? '-3 tonnes CO₂ ce mois-ci' : '-3 tons CO₂ this month'}
              </span>
              <span style={{ fontSize:12, background:'rgba(255,255,255,0.05)', color:'#666', borderRadius:6, padding:'3px 10px', fontWeight:600 }}>
                {lang === 'fr' ? 'Fait avec ❤️ en France' : 'Made with ❤️ in France'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
