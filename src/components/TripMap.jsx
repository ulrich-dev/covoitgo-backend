import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CITIES_CM, DISTANCES_CM, haversineKm } from '../data/cameroun'

// ── Helpers ────────────────────────────────────────────────
const getCity = (name) => CITIES_CM.find(c => c.name.toLowerCase() === name?.toLowerCase())
const fmtDur  = (m) => { const h=Math.floor(m/60),r=m%60; return r>0?`${h}h${String(r).padStart(2,'0')}`:`${h}h00` }

// ── Style MapLibre — tuiles OSM raster, aucune clé API ───
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

// ── OSRM — plusieurs endpoints en cascade ────────────────
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
]

async function fetchOSRM(fromCity, toCity) {
  const coords = `${fromCity.lng},${fromCity.lat};${toCity.lng},${toCity.lat}`
  for (const base of OSRM_ENDPOINTS) {
    try {
      const res  = await fetch(`${base}/${coords}?overview=full&geometries=geojson&steps=false`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.length) continue
      const r = data.routes[0]
      return {
        geojson:  r.geometry,
        distance: Math.round(r.distance / 1000),
        duration: Math.round(r.duration / 60),
      }
    } catch { /* essayer le suivant */ }
  }
  throw new Error('Tous les endpoints OSRM ont échoué')
}

// ── Marqueur HTML custom ─────────────────────────────────
function makeMarkerEl(color, label) {
  const el = document.createElement('div')
  el.style.cssText = 'width:36px;height:44px;cursor:pointer'
  el.innerHTML = `
    <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg"
      style="width:100%;height:100%;filter:drop-shadow(0 4px 10px ${color}88)">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="${color}"/>
      <circle cx="18" cy="18" r="9" fill="white" opacity="0.2"/>
      <text x="18" y="23" text-anchor="middle" font-size="13" font-weight="900"
        font-family="sans-serif" fill="white">${label}</text>
    </svg>`
  return el
}

// ── Composant ─────────────────────────────────────────────
export default function TripMap({ from, to, height = 340 }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const [routeInfo,  setRouteInfo]  = useState(null)
  const [status,     setStatus]     = useState('idle') // idle|loading|ok|fallback

  const fromCity = getCity(from)
  const toCity   = getCity(to)
  const localKey  = fromCity && toCity ? `${fromCity.name}-${toCity.name}` : null
  const localData = localKey ? DISTANCES_CM[localKey] : null

  useEffect(() => {
    if (!fromCity || !toCity || !containerRef.current) return

    // Nettoyer la carte précédente
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    setRouteInfo(null)
    setStatus('idle')

    // ── Attendre que le container ait des dimensions réelles
    requestAnimationFrame(() => {
      if (!containerRef.current) return

      const map = new maplibregl.Map({
        container:          containerRef.current,
        style:              OSM_STYLE,
        center:             [(fromCity.lng+toCity.lng)/2, (fromCity.lat+toCity.lat)/2],
        zoom:               6,
        attributionControl: true,
      })
      mapRef.current = map

      map.addControl(new maplibregl.NavigationControl(),         'top-right')
      map.addControl(new maplibregl.ScaleControl({ unit:'metric' }), 'bottom-left')

      map.on('load', async () => {

        // ── Marqueurs ───────────────────────────────────
        new maplibregl.Marker({ element: makeMarkerEl('#1A9E8A', 'A') })
          .setLngLat([fromCity.lng, fromCity.lat])
          .setPopup(new maplibregl.Popup({ offset:46, closeButton:false })
            .setHTML(`<b style="color:#1A9E8A">🚗 ${fromCity.name}</b><br><span style="color:#aaa;font-size:11px">${fromCity.region}</span>`))
          .addTo(map)

        new maplibregl.Marker({ element: makeMarkerEl('#FF6B35', 'B') })
          .setLngLat([toCity.lng, toCity.lat])
          .setPopup(new maplibregl.Popup({ offset:46, closeButton:false })
            .setHTML(`<b style="color:#FF6B35">🏁 ${toCity.name}</b><br><span style="color:#aaa;font-size:11px">${toCity.region}</span>`))
          .addTo(map)

        // Cadrer sur les deux villes d'abord
        map.fitBounds(
          [[fromCity.lng, fromCity.lat], [toCity.lng, toCity.lat]],
          { padding: 70, maxZoom: 11 }
        )

        // ── Appel OSRM ──────────────────────────────────
        setStatus('loading')
        try {
          const route = await fetchOSRM(fromCity, toCity)

          // ⚠️  line-cap / line-join vont dans LAYOUT, pas paint
          map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: route.geojson },
          })

          // Couche halo (fond élargi)
          map.addLayer({
            id:     'route-halo',
            type:   'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint:  { 'line-color': 'rgba(26,158,138,.15)', 'line-width': 14 },
          })

          // Couche principale
          map.addLayer({
            id:     'route-line',
            type:   'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint:  { 'line-color': '#1A9E8A', 'line-width': 4, 'line-opacity': 0.95 },
          })

          // Recadrer sur la route réelle
          const coords = route.geojson.coordinates
          const bounds = coords.reduce(
            (b, c) => b.extend(c),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          )
          map.fitBounds(bounds, { padding: 60, maxZoom: 12 })

          setRouteInfo({ distance: route.distance, duration: route.duration, source: 'osrm' })
          setStatus('ok')

        } catch (err) {
          console.warn('[TripMap] OSRM failed:', err.message)

          // Fallback : ligne droite
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [fromCity.lng, fromCity.lat],
                  [toCity.lng,   toCity.lat],
                ],
              },
            },
          })
          map.addLayer({
            id:     'route-line',
            type:   'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint:  { 'line-color': '#FF6B35', 'line-width': 3, 'line-opacity': 0.7 },
          })

          const km  = localData ? localData[0] : haversineKm(fromCity.name, toCity.name)
          const dur = localData ? localData[1] : null
          setRouteInfo({ distance: km, duration: dur, source: 'local' })
          setStatus('fallback')
        }
      })
    })

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [from, to])

  if (!fromCity || !toCity) {
    return (
      <div style={{ height, borderRadius:14, background:'#f0fdf8', border:'1.5px solid rgba(26,158,138,.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:13, fontWeight:600 }}>
        🗺️ {!fromCity ? `"${from}"` : `"${to}"`} introuvable sur la carte
      </div>
    )
  }

  const km   = routeInfo?.distance ?? (localData?.[0] ?? haversineKm(fromCity.name, toCity.name))
  const mins = routeInfo?.duration ?? localData?.[1] ?? null
  const kmh  = km && mins ? Math.round(km / (mins / 60)) : null

  return (
    <div style={{ borderRadius:14, overflow:'hidden', border:'1.5px solid rgba(26,158,138,.18)', boxShadow:'0 4px 20px rgba(26,158,138,.12)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

      {/* ══ Carte ══ */}
      <div style={{ position:'relative' }}>
        <div ref={containerRef} style={{ height, width:'100%' }} />

        {/* Badge statut route */}
        {status === 'loading' && (
          <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(255,255,255,.96)', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, color:'#1A9E8A', display:'flex', alignItems:'center', gap:7, boxShadow:'0 2px 10px rgba(0,0,0,.12)' }}>
            <span style={{ width:11, height:11, border:'2.5px solid #1A9E8A', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'_spin .65s linear infinite' }}/>
            Calcul de l'itinéraire…
          </div>
        )}
        {status === 'ok' && (
          <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(255,255,255,.96)', borderRadius:8, padding:'5px 11px', fontSize:11, fontWeight:700, color:'#1A9E8A', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 10px rgba(0,0,0,.12)' }}>
            <span style={{ width:7, height:7, background:'#1A9E8A', borderRadius:'50%', boxShadow:'0 0 0 2px rgba(26,158,138,.25)' }}/>
            Itinéraire OSRM · route réelle
          </div>
        )}
        {status === 'fallback' && (
          <div style={{ position:'absolute', top:10, left:10, zIndex:10, background:'rgba(255,255,255,.96)', borderRadius:8, padding:'5px 11px', fontSize:11, fontWeight:700, color:'#FF6B35', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 10px rgba(0,0,0,.12)' }}>
            〰️ Tracé approximatif (OSRM indisponible)
          </div>
        )}

        <style>{`@keyframes _spin { to { transform:rotate(360deg) } }`}</style>
      </div>

      {/* ══ Panneau infos ══ */}
      <div style={{ background:'#fff', borderTop:'1px solid rgba(0,0,0,.07)', padding:'12px 14px', display:'flex', gap:8, flexWrap:'wrap' }}>

        <div style={{ flex:'1 1 80px', minWidth:76, background:'#E8F7F4', borderRadius:10, padding:'9px 12px', textAlign:'center' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'#1A9E8A', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:3 }}>Distance</div>
          <div style={{ fontSize:18, fontWeight:900, color:'#1A1A1A' }}>{km != null ? `${km} km` : '—'}</div>
          <div style={{ fontSize:9, color: status==='ok'?'#1A9E8A':'#bbb', marginTop:1, fontWeight:700 }}>
            {status==='ok' ? 'route réelle' : 'estimée'}
          </div>
        </div>

        <div style={{ flex:'1 1 80px', minWidth:76, background:'#FFF5F0', borderRadius:10, padding:'9px 12px', textAlign:'center' }}>
          <div style={{ fontSize:9, fontWeight:800, color:'#FF6B35', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:3 }}>Durée</div>
          <div style={{ fontSize:18, fontWeight:900, color:'#1A1A1A' }}>{mins != null ? fmtDur(mins) : '—'}</div>
          <div style={{ fontSize:9, color: status==='ok'?'#FF6B35':'#bbb', marginTop:1, fontWeight:700 }}>
            {status==='ok' ? 'OSRM' : 'estimée'}
          </div>
        </div>

        {kmh && (
          <div style={{ flex:'1 1 80px', minWidth:76, background:'#F3F0FF', borderRadius:10, padding:'9px 12px', textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:800, color:'#7C3AED', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:3 }}>Vitesse moy.</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#1A1A1A' }}>{kmh} km/h</div>
            <div style={{ fontSize:9, color:'#bbb', marginTop:1 }}>route nationale</div>
          </div>
        )}

        <div style={{ flex:'2 1 150px', minWidth:130, background:'#F7F5F2', borderRadius:10, padding:'9px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ textAlign:'center', minWidth:52 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'#1A9E8A', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:12, margin:'0 auto 3px' }}>A</div>
            <div style={{ fontSize:11, fontWeight:800 }}>{fromCity.name}</div>
            <div style={{ fontSize:9, color:'#aaa' }}>{fromCity.region}</div>
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <div style={{ width:'100%', height:2, background:'linear-gradient(90deg,#1A9E8A,#FF6B35)', borderRadius:2 }}/>
            <span style={{ fontSize:10, color:'#bbb', fontWeight:700 }}>{km != null ? `${km} km` : '→'}</span>
          </div>
          <div style={{ textAlign:'center', minWidth:52 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'#FF6B35', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:12, margin:'0 auto 3px' }}>B</div>
            <div style={{ fontSize:11, fontWeight:800 }}>{toCity.name}</div>
            <div style={{ fontSize:9, color:'#aaa' }}>{toCity.region}</div>
          </div>
        </div>

      </div>
    </div>
  )
}
