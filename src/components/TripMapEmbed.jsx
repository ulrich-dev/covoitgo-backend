import { useEffect, useRef, useState } from 'react'

// ══════════════════════════════════════════════════════════════
//  TripMapEmbed — Carte avec itinéraire réel, temps et distance
//  - Géocodage Nominatim si pas de coordonnées fournies
//  - Itinéraire routier via OSRM (gratuit, sans clé API)
//  - Affichage distance, durée estimée, étapes
// ══════════════════════════════════════════════════════════════

export default function TripMapEmbed({
  origin,           // { name, lat?, lon? }
  destination,      // { name, lat?, lon? }
  trip,             // objet trajet complet (optionnel)
  height = 320,
}) {
  const [html,      setHtml]     = useState('')
  const [loading,   setLoading]  = useState(true)
  const [routeInfo, setRouteInfo] = useState(null)

  useEffect(() => {
    if (!origin?.name && !destination?.name) return

    let cancelled = false
    setLoading(true)
    setRouteInfo(null)

    ;(async () => {
      try {
        // 1. Géocoder les villes si pas de coordonnées
        const geocode = async (city) => {
          if (!city?.name) return null
          if (city.lat && city.lon) return { lat: city.lat, lon: city.lon, name: city.name }
          const r = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city.name + ' Cameroun')}&limit=1`,
            { headers: { 'User-Agent': 'Clando-App/1.0' } }
          )
          const d = await r.json()
          if (!d[0]) return null
          return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), name: city.name }
        }

        const [orig, dest] = await Promise.all([geocode(origin), geocode(destination)])
        if (cancelled) return

        // 2. Récupérer l'itinéraire routier via OSRM
        let routeGeoJSON = null
        let distance = null, duration = null, steps = []

        if (orig && dest) {
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson&steps=true&annotations=false`
            const rRes = await fetch(osrmUrl)
            const rData = await rRes.json()

            if (rData.code === 'Ok' && rData.routes?.[0]) {
              const route = rData.routes[0]
              routeGeoJSON = route.geometry
              distance = route.distance    // mètres
              duration = route.duration    // secondes

              // Extraire quelques étapes clés
              const legs = route.legs || []
              steps = legs.flatMap(l => l.steps || [])
                .filter(s => s.maneuver?.type !== 'arrive' && s.name)
                .slice(0, 5)
                .map(s => s.name)
                .filter(Boolean)
            }
          } catch {}

          // Mettre à jour les infos de route
          if (!cancelled && distance !== null) {
            setRouteInfo({
              distance: distance < 1000
                ? `${Math.round(distance)} m`
                : `${(distance / 1000).toFixed(0)} km`,
              duration: duration < 3600
                ? `${Math.round(duration / 60)} min`
                : `${Math.floor(duration / 3600)}h${String(Math.round((duration % 3600) / 60)).padStart(2,'0')}`,
              durationMin: Math.round(duration / 60),
            })
          }
        }

        if (cancelled) return

        // 3. Générer le HTML Leaflet
        const generatedHtml = buildMapHtml({ orig, dest, routeGeoJSON, distance, duration })
        setHtml(generatedHtml)
      } catch (err) {
        console.warn('TripMapEmbed error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [origin?.name, destination?.name, origin?.lat, destination?.lat])

  if (!origin?.name && !destination?.name) return null

  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid #E5E7EB', position:'relative' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Carte */}
      <div style={{ height, position:'relative' }}>
        {loading && (
          <div style={{ position:'absolute', inset:0, background:'#F0FDF8', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #E5E7EB', borderTopColor:'#1A9E8A', margin:'0 auto 8px', animation:'spin .8s linear infinite' }}/>
              <span style={{ fontSize:12, color:'#9CA3AF' }}>Calcul de l'itinéraire…</span>
            </div>
          </div>
        )}
        {html && (
          <iframe
            srcDoc={html}
            style={{ width:'100%', height:'100%', border:'none', display:'block' }}
            title="Carte du trajet"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>

      {/* Bandeau infos sous la carte */}
      {routeInfo && (
        <div style={{
          background:'#fff', borderTop:'1px solid #F3F4F6',
          display:'flex', alignItems:'stretch',
        }}>
          <InfoCell icon="📍" label="Départ"  value={origin?.name || ''}      flex={2}/>
          <Divider/>
          <InfoCell icon="🕐" label="Durée"   value={routeInfo.duration}        flex={1} color="#1A9E8A"/>
          <Divider/>
          <InfoCell icon="📏" label="Distance" value={routeInfo.distance}       flex={1} color="#7C3AED"/>
          <Divider/>
          <InfoCell icon="🏁" label="Arrivée" value={destination?.name || ''}  flex={2}/>
        </div>
      )}

      {/* Infos trajet si fourni */}
      {trip && (
        <div style={{
          background:'#F7F8FA', borderTop:'1px solid #F3F4F6',
          display:'flex', gap:0, alignItems:'stretch',
        }}>
          {trip.departure_time && (
            <InfoCell icon="⏰" label="Départ"
              value={new Date(trip.departure_time).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
              flex={1} color="#374151"/>
          )}
          {trip.price_per_seat && (
            <>
              <Divider/>
              <InfoCell icon="💰" label="Prix / place"
                value={`${Number(trip.price_per_seat).toLocaleString('fr-FR')} FCFA`}
                flex={1.5} color="#1A9E8A"/>
            </>
          )}
          {trip.available_seats !== undefined && (
            <>
              <Divider/>
              <InfoCell icon="👤" label="Places"
                value={`${trip.available_seats} dispo`}
                flex={1} color={trip.available_seats > 0 ? '#10B981' : '#EF4444'}/>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InfoCell({ icon, label, value, flex = 1, color = '#111827' }) {
  return (
    <div style={{ flex, padding:'10px 12px', textAlign:'center', minWidth:0 }}>
      <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
      <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:2 }}>
        {label}
      </div>
      <div style={{ fontSize:13, fontWeight:800, color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ width:1, background:'#F3F4F6', alignSelf:'stretch' }}/>
}

// ── Génère le HTML Leaflet complet avec itinéraire ────────────
function buildMapHtml({ orig, dest, routeGeoJSON, distance, duration }) {
  const hasRoute = !!routeGeoJSON

  // Centre et zoom
  let centerLat = 4.5, centerLon = 11.5, zoom = 6
  if (orig && dest) {
    centerLat = (orig.lat + dest.lat) / 2
    centerLon = (orig.lon + dest.lon) / 2
    const d = Math.max(Math.abs(orig.lat - dest.lat), Math.abs(orig.lon - dest.lon))
    zoom = d > 5 ? 6 : d > 2 ? 8 : d > 1 ? 9 : 11
  } else if (orig) {
    centerLat = orig.lat; centerLon = orig.lon; zoom = 11
  } else if (dest) {
    centerLat = dest.lat; centerLon = dest.lon; zoom = 11
  }

  const routeJson = routeGeoJSON ? JSON.stringify(routeGeoJSON) : 'null'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;background:#F0FDF8}
  .leaflet-control-attribution{font-size:9px!important;background:rgba(255,255,255,.8)!important}
  .info-popup{font-family:-apple-system,sans-serif;font-size:13px;line-height:1.5}
  .info-popup strong{font-weight:800;color:#111}
  .lbl{background:rgba(255,255,255,.95);border:1.5px solid rgba(26,158,138,.3);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;color:#1A9E8A;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12)}
  .lbl-dest{border-color:rgba(239,68,68,.3);color:#EF4444}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', {
  center: [${centerLat}, ${centerLon}],
  zoom: ${zoom},
  zoomControl: true,
  scrollWheelZoom: false,
  attributionControl: false,
})

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map)

L.control.attribution({ prefix: false }).addTo(map)

var origCoords = ${orig ? `[${orig.lat}, ${orig.lon}]` : 'null'}
var destCoords = ${dest  ? `[${dest.lat},  ${dest.lon}]`  : 'null'}
var routeGeoJSON = ${routeJson}
var origName = ${orig ? JSON.stringify(orig.name) : '"Départ"'}
var destName = ${dest  ? JSON.stringify(dest.name)  : '"Arrivée"'}
var distance = ${distance || 'null'}
var duration = ${duration || 'null'}

// ── Icônes personnalisées ────────────────────────────────────
function makeIcon(color, letter) {
  return L.divIcon({
    html: '<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:'+color+';transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:14px;display:block;text-align:center;line-height:30px">'+letter+'</span></div>',
    className: '',
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
  })
}

// ── Tracer l'itinéraire ──────────────────────────────────────
if (routeGeoJSON) {
  // Itinéraire réel depuis OSRM
  var coords = routeGeoJSON.coordinates.map(function(c){ return [c[1], c[0]] })

  // Halo sous l'itinéraire
  L.polyline(coords, {
    color: 'rgba(26,158,138,.2)',
    weight: 12,
    lineCap: 'round',
  }).addTo(map)

  // Ligne principale
  L.polyline(coords, {
    color: '#1A9E8A',
    weight: 4,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map)

  // Ajuster la vue sur l'itinéraire
  var bounds = L.latLngBounds(coords)
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })

} else if (origCoords && destCoords) {
  // Ligne droite de secours
  L.polyline([origCoords, destCoords], {
    color: '#1A9E8A',
    weight: 3,
    dashArray: '8 6',
    opacity: 0.7,
  }).addTo(map)

  var bounds = L.latLngBounds([origCoords, destCoords])
  map.fitBounds(bounds, { padding: [50, 50] })
}

// ── Marqueurs ────────────────────────────────────────────────
var bounds_pts = []

if (origCoords) {
  var dLine = ''
  if (duration) {
    var h = Math.floor(duration/3600)
    var m = Math.round((duration%3600)/60)
    dLine = '<br><span style="color:#1A9E8A;font-weight:700">⏱ ' + (h>0?h+'h':'') + m+'min de trajet</span>'
  }
  var distLine = distance ? '<br><span style="color:#7C3AED;font-weight:700">📏 ' + (distance<1000?Math.round(distance)+'m':(distance/1000).toFixed(0)+'km') + '</span>' : ''

  var mA = L.marker(origCoords, { icon: makeIcon('#1A9E8A','A'), zIndexOffset: 100 })
    .addTo(map)
    .bindPopup('<div class="info-popup"><strong>🚗 Départ</strong><br>' + origName + dLine + distLine + '</div>')

  L.marker(origCoords, {
    icon: L.divIcon({
      html: '<div class="lbl">🚗 ' + origName + '</div>',
      className: '',
      iconAnchor: [-8, 36],
    })
  }).addTo(map)

  bounds_pts.push(origCoords)
}

if (destCoords) {
  var mB = L.marker(destCoords, { icon: makeIcon('#EF4444','B'), zIndexOffset: 100 })
    .addTo(map)
    .bindPopup('<div class="info-popup"><strong>🏁 Arrivée</strong><br>' + destName + '</div>')

  L.marker(destCoords, {
    icon: L.divIcon({
      html: '<div class="lbl lbl-dest">🏁 ' + destName + '</div>',
      className: '',
      iconAnchor: [-8, 36],
    })
  }).addTo(map)

  bounds_pts.push(destCoords)
}

// Ajuster si pas d'itinéraire mais deux points
if (!routeGeoJSON && bounds_pts.length === 2) {
  map.fitBounds(L.latLngBounds(bounds_pts), { padding: [60, 60] })
}
</script>
</body>
</html>`
}
