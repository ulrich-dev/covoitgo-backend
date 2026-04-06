import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdmin } from '../../hooks/useAdmin'
import { fmtFCFA } from '../../data/cameroun'

// ── Helpers ────────────────────────────────────────────────────
const fmtDay = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const fmtDow = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short' })

// ══════════════════════════════════════════════════════════════
//  Composants graphiques SVG
// ══════════════════════════════════════════════════════════════

// ── Graphique en courbe (Line chart) ──────────────────────────
function LineChart({ data, color = '#1A9E8A', color2, label, label2, height = 120 }) {
  if (!data?.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>Aucune donnée</div>
  )

  const W = 560, H = height
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 }
  const w = W - PAD.left - PAD.right
  const h = H - PAD.top - PAD.bottom

  const vals1 = data.map(d => parseInt(d.total_logins || d.count || 0))
  const vals2 = color2 ? data.map(d => parseInt(d.unique_users || 0)) : []
  const allVals = [...vals1, ...vals2]
  const maxV = Math.max(...allVals, 1)

  const x = (i) => PAD.left + (i / (data.length - 1 || 1)) * w
  const y = (v) => PAD.top  + h - (v / maxV) * h

  const path1 = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(vals1[i]).toFixed(1)}`).join(' ')
  const area1  = `${path1} L${x(data.length-1).toFixed(1)},${(PAD.top + h).toFixed(1)} L${PAD.left},${(PAD.top + h).toFixed(1)} Z`
  const path2  = color2 ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(vals2[i]).toFixed(1)}`).join(' ') : ''

  // Graduations Y
  const ticks = [0, Math.round(maxV / 2), maxV]

  // Labels X (afficher max 7 dates)
  const step = Math.max(1, Math.floor(data.length / 6))
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`g1-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        {color2 && (
          <linearGradient id={`g2-${color2.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity="0.12"/>
            <stop offset="100%" stopColor={color2} stopOpacity="0"/>
          </linearGradient>
        )}
      </defs>

      {/* Grid horizontale */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.left} y1={y(t)} x2={PAD.left + w} y2={y(t)}
            stroke="rgba(0,0,0,.06)" strokeDasharray="4 4"/>
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="9" fill="#aaa">{t}</text>
        </g>
      ))}

      {/* Aire sous la courbe 1 */}
      <path d={area1} fill={`url(#g1-${color.replace('#','')})`}/>
      {/* Courbe 1 */}
      <path d={path1} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

      {/* Courbe 2 (si dualiste) */}
      {color2 && path2 && (
        <>
          <path d={`${path2} L${x(data.length-1).toFixed(1)},${(PAD.top+h).toFixed(1)} L${PAD.left},${(PAD.top+h).toFixed(1)} Z`}
            fill={`url(#g2-${color2.replace('#','')})`}/>
          <path d={path2} fill="none" stroke={color2} strokeWidth="2" strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round"/>
        </>
      )}

      {/* Points sur la courbe 1 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(vals1[i])} r="3.5" fill="#fff" stroke={color} strokeWidth="2"/>
          {/* Tooltip hover zone */}
          <title>{fmtDay(d.day)}: {vals1[i]} {label}{color2 ? ` / ${vals2[i]} ${label2}` : ''}</title>
          <circle cx={x(i)} cy={y(vals1[i])} r="12" fill="transparent"/>
        </g>
      ))}

      {/* Labels X */}
      {xLabels.map((d, i) => {
        const origIdx = data.indexOf(d)
        return (
          <text key={i} x={x(origIdx)} y={H - 4} textAnchor="middle" fontSize="9" fill="#bbb">
            {fmtDow(d.day)} {new Date(d.day).getDate()}
          </text>
        )
      })}
    </svg>
  )
}

// ── Mini barres (Bar chart) ────────────────────────────────────
function BarChart({ data, color = '#1A9E8A', label, height = 80 }) {
  if (!data?.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>Aucune donnée</div>
  )
  const max = Math.max(...data.map(d => parseInt(d.count || d.unique_users || 0)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => {
        const val = parseInt(d.count || d.unique_users || 0)
        const pct = (val / max) * (height - 20)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }} title={`${fmtDow(d.day)} : ${val} ${label}`}>
            <div style={{ fontSize: 8, color: '#bbb', fontWeight: 700 }}>{val > 0 ? val : ''}</div>
            <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: color, height: `${Math.max(pct, val > 0 ? 3 : 0)}px`, opacity: .82, transition: 'height .4s ease' }}/>
            <div style={{ fontSize: 8, color: '#ccc', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {fmtDow(d.day)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Heatmap heures ─────────────────────────────────────────────
function HourHeatmap({ data }) {
  if (!data?.length) return <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Aucune donnée</div>

  const byHour = {}
  data.forEach(d => { byHour[parseInt(d.hour)] = parseInt(d.count) })
  const max = Math.max(...Object.values(byHour), 1)

  const PERIODS = [
    { label: 'Nuit', hours: [0,1,2,3,4,5] },
    { label: 'Matin', hours: [6,7,8,9,10,11] },
    { label: 'Après-midi', hours: [12,13,14,15,16,17] },
    { label: 'Soir', hours: [18,19,20,21,22,23] },
  ]

  return (
    <div>
      {PERIODS.map(p => (
        <div key={p.label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{p.label}</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {p.hours.map(h => {
              const v   = byHour[h] || 0
              const pct = v / max
              const bg  = pct > 0.75 ? '#1A9E8A' : pct > 0.5 ? '#22C6AD' : pct > 0.25 ? '#7DE8D8' : pct > 0 ? '#C8F5EE' : '#F1F5F9'
              return (
                <div key={h} title={`${h}h : ${v} connexions`}
                  style={{ flex: 1, height: 28, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', transition: 'opacity .15s' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: pct > 0.4 ? '#fff' : '#bbb' }}>{h}h</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: '#bbb' }}>Faible</span>
        {['#F1F5F9','#C8F5EE','#7DE8D8','#22C6AD','#1A9E8A'].map((c,i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: c }}/>
        ))}
        <span style={{ fontSize: 10, color: '#bbb' }}>Élevé</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Composants KPI
// ══════════════════════════════════════════════════════════════
function KpiCard({ icon, label, value, sub, color = '#1A9E8A', trend }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
        {trend != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#16A34A' : '#DC2626', background: trend >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, padding: '2px 8px' }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} cette semaine
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', letterSpacing: '-.03em' }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Carte section ─────────────────────────────────────────────
function Card({ title, subtitle, children, action }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Page Dashboard
// ══════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { apiFetch, loading } = useAdmin()
  const [stats, setStats]     = useState(null)

  useEffect(() => {
    apiFetch('/api/admin/stats').then(d => { if (d.success) setStats(d.stats) })
  }, [])

  if (loading || !stats) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {[...Array(8)].map((_,i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 16, height: 120, border: '1px solid #E2E8F0', animation: 'pulse 1.5s ease infinite' }}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )

  const { users, trips, bookings, revenue, charts, topRoutes, connections } = stats
  const conn = connections || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Titre ── */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-.02em' }}>Tableau de bord</h1>
        <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>Vue d'ensemble — {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
      </div>

      {/* ══ SECTION 1 — KPIs généraux ══ */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Statistiques générales</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <KpiCard icon="👥" label="Utilisateurs"  value={parseInt(users.total).toLocaleString()} sub={`${parseInt(users.active)} actifs · ${parseInt(users.admins)} admins`} trend={parseInt(users.new_week)} color="#1A9E8A"/>
          <KpiCard icon="🚗" label="Trajets"        value={parseInt(trips.total).toLocaleString()} sub={`${parseInt(trips.active)} actifs · ${parseInt(trips.completed)} terminés`} trend={parseInt(trips.new_week)} color="#FF6B35"/>
          <KpiCard icon="🎫" label="Réservations"  value={parseInt(bookings.total).toLocaleString()} sub={`${parseInt(bookings.confirmed)} confirmées · ${parseInt(bookings.cancelled)} annulées`} trend={parseInt(bookings.new_week)} color="#7C3AED"/>
          <KpiCard icon="💰" label="Revenus (30j)"  value={fmtFCFA(parseFloat(revenue.month_revenue))} sub={`Total : ${fmtFCFA(parseFloat(revenue.total_revenue))}`} color="#F59E0B"/>
        </div>
      </div>

      {/* ══ SECTION 2 — KPIs connexions ══ */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Activité & Connexions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
          {[
            { icon:'🟢', label:'Actifs aujourd\'hui',  value: conn.active24h || 0,   sub:`${conn.last24h || 0} connexions en 24h`,          color:'#22C55E' },
            { icon:'📅', label:'Actifs cette semaine', value: conn.active7d  || 0,   sub:`${conn.last7d  || 0} connexions en 7j`,            color:'#1A9E8A' },
            { icon:'🔑', label:'Total connexions',     value: (conn.total    || 0).toLocaleString(), sub:`${conn.uniqueUsers || 0} utilisateurs distincts`, color:'#0EA5E9' },
          ].map(c => (
            <div key={c.label} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #E2E8F0', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>{c.icon}</div>
              <div style={{ fontSize:26, fontWeight:900, color:c.color, letterSpacing:'-.02em' }}>{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginTop:3 }}>{c.label}</div>
              <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{c.sub}</div>
            </div>
          ))}
          {/* Méthodes de connexion */}
          <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #E2E8F0', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🔐</div>
            <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:8 }}>Méthodes</div>
            {(conn.byMethod || []).map(m => {
              const total = conn.total || 1
              const pct   = Math.round((parseInt(m.count) / total) * 100)
              const icons = { email: '📧', google: '🟡', facebook: '🔵' }
              return (
                <div key={m.method} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:11 }}>{icons[m.method] || '🔑'}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#555', flex:1, textTransform:'capitalize' }}>{m.method}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:'#1A9E8A' }}>{pct}%</span>
                </div>
              )
            })}
            {!conn.byMethod?.length && <div style={{ fontSize:11, color:'#bbb' }}>Aucune donnée</div>}
          </div>
        </div>
      </div>

      {/* ══ SECTION 3 — Graphique connexions 30 jours ══ */}
      <Card
        title="Connexions quotidiennes — 30 derniers jours"
        subtitle="Courbe pleine = total connexions · Pointillés = utilisateurs distincts (DAU)"
        action={
          <div style={{ display:'flex', gap:12, fontSize:11, fontWeight:700 }}>
            <span style={{ color:'#1A9E8A', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:20, height:2.5, background:'#1A9E8A', display:'inline-block', borderRadius:2 }}/> Total</span>
            <span style={{ color:'#7C3AED', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:20, height:2, background:'#7C3AED', display:'inline-block', borderRadius:2, borderTop:'2px dashed #7C3AED' }}/> Uniques</span>
          </div>
        }>
        <LineChart data={conn.daily30 || []} color="#1A9E8A" color2="#7C3AED" label="connexions" label2="uniques" height={140}/>
      </Card>

      {/* ══ SECTION 4 — 2 colonnes : Heatmap heures + inscriptions 7j ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card title="Heures de pointe" subtitle="Activité par heure sur 30 jours">
          <HourHeatmap data={conn.byHour || []}/>
        </Card>

        <Card title="Nouvelles inscriptions — 7 jours">
          <BarChart data={charts.newUsers || []} color="#1A9E8A" label="inscriptions" height={100}/>
        </Card>
      </div>

      {/* ══ SECTION 5 — Réservations + Top routes ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Statuts réservations */}
        <Card title="Réservations par statut">
          {[
            { label:'⏳ En attente',  val:parseInt(bookings.pending),   color:'#F59E0B', bg:'#FFFBEB' },
            { label:'✅ Confirmées',  val:parseInt(bookings.confirmed),  color:'#1A9E8A', bg:'#ECFDF5' },
            { label:'❌ Annulées',    val:parseInt(bookings.cancelled),  color:'#EF4444', bg:'#FEF2F2' },
          ].map(s => {
            const total = parseInt(bookings.total) || 1
            const pct   = Math.round((s.val / total) * 100)
            return (
              <div key={s.label} style={{ marginBottom: 14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>{s.label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:s.color }}>{s.val} <span style={{ color:'#94A3B8', fontWeight:500 }}>({pct}%)</span></span>
                </div>
                <div style={{ height:7, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:4, transition:'width .6s ease' }}/>
                </div>
              </div>
            )
          })}
        </Card>

        {/* Top routes */}
        <Card title="Top trajets" action={<Link to="/admin/trips" style={{ fontSize:11, color:'#1A9E8A', fontWeight:700, textDecoration:'none' }}>Voir tout →</Link>}>
          {topRoutes.length === 0
            ? <div style={{ color:'#94A3B8', fontSize:12, textAlign:'center', padding:'16px 0' }}>Aucun trajet</div>
            : topRoutes.map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ width:24, height:24, borderRadius:8, background: i===0?'#FFF9C4':'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color: i===0?'#D97706':'#64748B', flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1, fontSize:12, fontWeight:700, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {r.from} → {r.to}
                </div>
                <span style={{ fontSize:12, fontWeight:800, color:'#1A9E8A', flexShrink:0 }}>{r.count}</span>
              </div>
            ))
          }
        </Card>
      </div>

      {/* ══ SECTION 6 — Raccourcis ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { to:'/admin/users',    icon:'👥', label:'Gérer les utilisateurs', sub:`${parseInt(users.total)} membres`, color:'#1A9E8A' },
          { to:'/admin/trips',    icon:'🚗', label:'Gérer les trajets',       sub:`${parseInt(trips.active)} actifs`,  color:'#FF6B35' },
          { to:'/admin/bookings', icon:'🎫', label:'Gérer les réservations',  sub:`${parseInt(bookings.pending)} en attente`, color:'#7C3AED' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ textDecoration:'none' }}>
            <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', transition:'all .18s', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 4px 14px ${item.color}22` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)' }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${item.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{item.label}</div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{item.sub}</div>
              </div>
              <div style={{ marginLeft:'auto', color:'#CBD5E1', fontSize:16 }}>→</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
