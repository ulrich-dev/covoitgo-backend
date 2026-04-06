import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/api'
import CityAutocomplete from '../components/CityAutocomplete'

const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Kumba', 'Limbe']

export default function AlertsPage() {
  const { t } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab,       setTab]       = useState('alerts')   // alerts | favorites
  const [alerts,    setAlerts]    = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')

  const [form, setForm] = useState({
    originCity: '', destinationCity: '',
    dateFrom: '', dateTo: '',
    maxPrice: '', seatsNeeded: 1,
  })
  const [favForm, setFavForm] = useState({ originCity: '', destinationCity: '' })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [rA, rF] = await Promise.all([
        fetch(`${API_URL}/api/alerts`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API_URL}/api/alerts/favorites`, { credentials: 'include' }).then(r => r.json()),
      ])
      if (rA.success) setAlerts(rA.alerts)
      if (rF.success) setFavorites(rF.favorites)
    } catch {}
    setLoading(false)
  }

  const flash = (m, err = false) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3000)
  }

  // ── Créer une alerte ─────────────────────────────────────────
  const createAlert = async (e) => {
    e.preventDefault()
    if (!form.originCity || !form.destinationCity) return flash('Sélectionnez départ et destination.', true)
    setSaving(true)
    try {
      const res  = await fetch(`${API_URL}/api/alerts`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCity:      form.originCity,
          destinationCity: form.destinationCity,
          dateFrom:        form.dateFrom || undefined,
          dateTo:          form.dateTo || undefined,
          maxPrice:        form.maxPrice ? parseInt(form.maxPrice) : undefined,
          seatsNeeded:     form.seatsNeeded,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAlerts(prev => [data.alert, ...prev])
        setShowForm(false)
        setForm({ originCity: '', destinationCity: '', dateFrom: '', dateTo: '', maxPrice: '', seatsNeeded: 1 })
        flash('✅ Alerte créée !')
      } else {
        flash(data.message, true)
      }
    } catch { flash('Erreur serveur.', true) }
    finally { setSaving(false) }
  }

  // ── Toggle alerte actif/inactif ───────────────────────────────
  const toggleAlert = async (id, isActive) => {
    try {
      const res  = await fetch(`${API_URL}/api/alerts/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const data = await res.json()
      if (data.success) setAlerts(prev => prev.map(a => a.id === id ? data.alert : a))
    } catch {}
  }

  // ── Supprimer une alerte ──────────────────────────────────────
  const deleteAlert = async (id) => {
    try {
      await fetch(`${API_URL}/api/alerts/${id}`, { method: 'DELETE', credentials: 'include' })
      setAlerts(prev => prev.filter(a => a.id !== id))
      flash('Alerte supprimée.')
    } catch {}
  }

  // ── Ajouter un favori ─────────────────────────────────────────
  const createFavorite = async (e) => {
    e.preventDefault()
    if (!favForm.originCity || !favForm.destinationCity) return flash('Sélectionnez départ et destination.', true)
    setSaving(true)
    try {
      const res  = await fetch(`${API_URL}/api/alerts/favorites`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originCity: favForm.originCity, destinationCity: favForm.destinationCity }),
      })
      const data = await res.json()
      if (data.success) {
        setFavorites(prev => {
          const exists = prev.find(f => f.id === data.favorite.id)
          return exists ? prev.map(f => f.id === data.favorite.id ? data.favorite : f) : [data.favorite, ...prev]
        })
        setFavForm({ originCity: '', destinationCity: '' })
        flash('⭐ Favori ajouté !')
      } else {
        flash(data.message, true)
      }
    } catch { flash('Erreur serveur.', true) }
    finally { setSaving(false) }
  }

  // ── Toggle notif favori ───────────────────────────────────────
  const toggleFavNotify = async (id, notify) => {
    try {
      const res  = await fetch(`${API_URL}/api/alerts/favorites/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify }),
      })
      const data = await res.json()
      if (data.success) setFavorites(prev => prev.map(f => f.id === id ? data.favorite : f))
    } catch {}
  }

  // ── Supprimer un favori ───────────────────────────────────────
  const deleteFavorite = async (id) => {
    try {
      await fetch(`${API_URL}/api/alerts/favorites/${id}`, { method: 'DELETE', credentials: 'include' })
      setFavorites(prev => prev.filter(f => f.id !== id))
      flash('Favori supprimé.')
    } catch {}
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  if (!user) return null

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .al-tab { padding:10px 20px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;color:#888;border-bottom:3px solid transparent;transition:all .18s; }
        .al-tab.act { color:#1A9E8A;border-bottom-color:#1A9E8A; }
        .al-card { background:#fff;border-radius:14px;border:1px solid #E2E8F0;padding:18px 20px;display:flex;align-items:center;gap:14px;animation:fadeUp .25s ease; }
        .al-toggle { width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0; }
        .al-toggle::after { content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s; }
        .al-toggle.on { background:#1A9E8A; }
        .al-toggle.on::after { transform:translateX(18px); }
        .al-toggle.off { background:#CBD5E1; }
        .btn-del { background:none;border:none;cursor:pointer;color:#EF4444;font-size:16px;padding:4px;border-radius:6px;transition:background .15s; }
        .btn-del:hover { background:#FEF2F2; }
        .inp { width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;font-family:inherit;outline:none;color:#1A1A1A;transition:border-color .18s; }
        .inp:focus { border-color:#1A9E8A; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 72px)', background:'#F7F5F2', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', padding:'28px 0 0' }}>
          <div style={{ maxWidth:720, margin:'0 auto', padding:'0 20px' }}>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:900, margin:'0 0 4px' }}>
              🔔 Alertes & Favoris
            </h1>
            <p style={{ color:'rgba(255,255,255,.8)', fontSize:13, margin:'0 0 20px' }}>
              Soyez notifié dès qu'un trajet correspond à vos critères
            </p>
            <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,.2)' }}>
              {[
                { id:'alerts',    label:`🔔 Alertes (${alerts.length})` },
                { id:'favorites', label:`⭐ Favoris (${favorites.length})` },
              ].map(t => (
                <button key={t.id} className={`al-tab${tab===t.id?' act':''}`}
                  onClick={() => setTab(t.id)}
                  style={{ color: tab===t.id ? '#fff' : 'rgba(255,255,255,.65)', borderBottomColor: tab===t.id ? '#fff' : 'transparent', paddingBottom:14 }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flash */}
        {msg && (
          <div style={{ position:'fixed', top:88, left:'50%', transform:'translateX(-50%)',
            background:msg.startsWith('✅')||msg.startsWith('⭐') ? '#E8F7F4' : '#FEF2F2',
            color:msg.startsWith('✅')||msg.startsWith('⭐') ? '#0f766e' : '#DC2626',
            borderRadius:12, padding:'10px 22px', fontWeight:700, fontSize:14,
            boxShadow:'0 4px 16px rgba(0,0,0,.12)', zIndex:999, whiteSpace:'nowrap' }}>
            {msg}
          </div>
        )}

        <div style={{ maxWidth:720, margin:'0 auto', padding:'28px 20px 60px' }}>

          {/* ════ TAB ALERTES ════ */}
          {tab === 'alerts' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div style={{ fontSize:13, color:'#94A3B8', fontWeight:600 }}>
                  {alerts.filter(a => a.is_active).length} alerte{alerts.filter(a => a.is_active).length !== 1 ? 's' : ''} active{alerts.filter(a => a.is_active).length !== 1 ? 's' : ''}
                  <span style={{ marginLeft:8, color:'#CBD5E1' }}>· max 5</span>
                </div>
                {!showForm && (
                  <button onClick={() => setShowForm(true)}
                    style={{ background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none',
                      borderRadius:22, padding:'9px 18px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    + Nouvelle alerte
                  </button>
                )}
              </div>

              {/* Formulaire nouvelle alerte */}
              {showForm && (
                <form onSubmit={createAlert} style={{ background:'#fff', borderRadius:14, border:'1.5px solid #1A9E8A', padding:'20px', marginBottom:18, animation:'fadeUp .2s ease' }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'#1A1A1A', marginBottom:16 }}>
                    🔔 Nouvelle alerte
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Départ *</label>
                      <CityAutocomplete value={form.originCity} onChange={v => setForm(f => ({...f, originCity: v}))} placeholder="Ville de départ"/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Destination *</label>
                      <CityAutocomplete value={form.destinationCity} onChange={v => setForm(f => ({...f, destinationCity: v}))} placeholder="Ville d'arrivée"/>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Date min</label>
                      <input type="date" className="inp" value={form.dateFrom} onChange={e => setForm(f => ({...f, dateFrom: e.target.value}))} style={{ padding:'11px 14px' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Date max</label>
                      <input type="date" className="inp" value={form.dateTo} onChange={e => setForm(f => ({...f, dateTo: e.target.value}))} style={{ padding:'11px 14px' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Prix max (FCFA)</label>
                      <input type="number" className="inp" placeholder="Ex: 5000" value={form.maxPrice} onChange={e => setForm(f => ({...f, maxPrice: e.target.value}))} style={{ padding:'11px 14px' }}/>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button type="button" onClick={() => setShowForm(false)}
                      style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(0,0,0,.1)', background:'#f8fafc', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', color:'#555' }}>
                      Annuler
                    </button>
                    <button type="submit" disabled={saving}
                      style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                      {saving ? 'Création…' : '🔔 Créer l\'alerte'}
                    </button>
                  </div>
                </form>
              )}

              {/* Liste alertes */}
              {loading ? (
                <div style={{ textAlign:'center', color:'#94A3B8', padding:40 }}>Chargement…</div>
              ) : alerts.length === 0 ? (
                <div style={{ background:'#fff', borderRadius:14, padding:'48px 24px', textAlign:'center', border:'1px solid #E2E8F0' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#1A1A1A', marginBottom:8 }}>Aucune alerte</div>
                  <div style={{ fontSize:13, color:'#94A3B8' }}>Créez une alerte pour être notifié dès qu'un trajet correspond à vos critères</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {alerts.map(a => (
                    <div key={a.id} className="al-card" style={{ opacity: a.is_active ? 1 : 0.6 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:'#1A1A1A' }}>
                          {a.origin_city} → {a.destination_city}
                        </div>
                        <div style={{ fontSize:12, color:'#94A3B8', marginTop:4, display:'flex', gap:12, flexWrap:'wrap' }}>
                          {a.date_from && <span>📅 Du {fmtDate(a.date_from)}{a.date_to ? ` au ${fmtDate(a.date_to)}` : ''}</span>}
                          {a.max_price && <span>💰 Max {new Intl.NumberFormat('fr-FR').format(a.max_price)} FCFA</span>}
                          {a.seats_needed > 1 && <span>👥 {a.seats_needed} places</span>}
                          {!a.date_from && !a.max_price && <span>Toutes dates · Tous prix</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <button className={`al-toggle ${a.is_active ? 'on' : 'off'}`}
                          onClick={() => toggleAlert(a.id, !a.is_active)}
                          title={a.is_active ? 'Désactiver' : 'Activer'}/>
                        <button className="btn-del" onClick={() => deleteAlert(a.id)} title="Supprimer">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════ TAB FAVORIS ════ */}
          {tab === 'favorites' && (
            <>
              <div style={{ marginBottom:18 }}>
                <form onSubmit={createFavorite} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px', display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Départ *</label>
                    <CityAutocomplete value={favForm.originCity} onChange={v => setFavForm(f => ({...f, originCity: v}))} placeholder="Ville de départ"/>
                  </div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Destination *</label>
                    <CityAutocomplete value={favForm.destinationCity} onChange={v => setFavForm(f => ({...f, destinationCity: v}))} placeholder="Ville d'arrivée"/>
                  </div>
                  <button type="submit" disabled={saving}
                    style={{ padding:'11px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap' }}>
                    ⭐ Ajouter
                  </button>
                </form>
              </div>

              {loading ? (
                <div style={{ textAlign:'center', color:'#94A3B8', padding:40 }}>Chargement…</div>
              ) : favorites.length === 0 ? (
                <div style={{ background:'#fff', borderRadius:14, padding:'48px 24px', textAlign:'center', border:'1px solid #E2E8F0' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#1A1A1A', marginBottom:8 }}>Aucun itinéraire favori</div>
                  <div style={{ fontSize:13, color:'#94A3B8' }}>Ajoutez vos trajets habituels pour être notifié à chaque nouvelle publication</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {favorites.map(f => (
                    <div key={f.id} className="al-card">
                      <div style={{ fontSize:22 }}>⭐</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:'#1A1A1A' }}>
                          {f.origin_city} → {f.destination_city}
                        </div>
                        <div style={{ fontSize:12, color:'#94A3B8', marginTop:3 }}>
                          Ajouté le {fmtDate(f.created_at)} · {f.notify ? '🔔 Notifications activées' : '🔕 Notifications désactivées'}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <button className={`al-toggle ${f.notify ? 'on' : 'off'}`}
                          onClick={() => toggleFavNotify(f.id, !f.notify)}
                          title={f.notify ? 'Désactiver les notifications' : 'Activer les notifications'}/>
                        <button className="btn-del" onClick={() => deleteFavorite(f.id)} title="Supprimer">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
