import { useEffect, useRef, useState } from 'react'

// ══════════════════════════════════════════════════════════════
//  TripMapEmbed — Carte OpenStreetMap via iframe Leaflet
//  Zéro dépendance supplémentaire, fonctionne partout
// ══════════════════════════════════════════════════════════════

export default function TripMapEmbed({ origin, destination, height = 280, showRoute = true }) {
  const iframeRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [loading,  setLoading]  = useState(true)

  // Générer le HTML de la carte Leaflet
  const mapHtml = generateMapHtml({ origin, destination, showRoute })

  useEffect(() => {
    setLoading(true)
    setMapReady(false)
    const t = setTimeout(() => { setLoading(false); setMapReady(true) }, 300)
    return () => clearTimeout(t)
  }, [origin?.name, destination?.name])

  if (!origin && !destination) return null

  return (
    <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1px solid #E5E7EB', height }}>
      {loading && (
        <div style={{ position:'absolute', inset:0, background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #E5E7EB', borderTopColor:'#1A9E8A', margin:'0 auto 8px', animation:'spin .8s linear infinite' }}/>
            <span style={{ fontSize:12, color:'#9CA3AF' }}>Chargement de la carte…</span>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {mapReady && (
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{ width:'100%', height:'100%', border:'none', display:'block' }}
          title="Carte du trajet"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setLoading(false)}
        />
      )}
    </div>
  )
}

// ── Générer la page HTML Leaflet embarquée ────────────────────
function generateMapHtml({ origin, destination, showRoute }) {
  // Coordonnées par défaut (Cameroun)
  const defaultLat = 3.848, defaultLon = 11.502, defaultZoom = 6

  const originCoords = origin?.lat    ? [origin.lat, origin.lon]           : null
  const destCoords   = destination?.lat ? [destination.lat, destination.lon] : null

  // Calculer le centre et le zoom automatiquement
  let centerLat = defaultLat, centerLon = defaultLon, zoom = defaultZoom

  if (originCoords && destCoords) {
    centerLat = (originCoords[0] + destCoords[0]) / 2
    centerLon = (originCoords[1] + destCoords[1]) / 2
    const latDiff = Math.abs(originCoords[0] - destCoords[0])
    const lonDiff = Math.abs(originCoords[1] - destCoords[1])
    const maxDiff = Math.max(latDiff, lonDiff)
    zoom = maxDiff > 5 ? 6 : maxDiff > 2 ? 8 : maxDiff > 0.5 ? 10 : 12
  } else if (originCoords) {
    centerLat = originCoords[0]; centerLon = originCoords[1]; zoom = 12
  } else if (destCoords) {
    centerLat = destCoords[0]; centerLon = destCoords[1]; zoom = 12
  }

  const markersJs = []

  if (originCoords) {
    markersJs.push(`
      var iconA = L.divIcon({
        html: '<div style="background:#1A9E8A;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:13px;display:block;text-align:center;line-height:26px">A</span></div>',
        className:'', iconAnchor:[16,32], popupAnchor:[0,-36]
      })
      L.marker([${originCoords}], {icon:iconA})
        .addTo(map)
        .bindPopup('<b>Départ :</b> ${(origin.name||'').replace(/'/g,"\\'")}')
        .openPopup()
    `)
  }

  if (destCoords) {
    markersJs.push(`
      var iconB = L.divIcon({
        html: '<div style="background:#EF4444;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:13px;display:block;text-align:center;line-height:26px">B</span></div>',
        className:'', iconAnchor:[16,32], popupAnchor:[0,-36]
      })
      L.marker([${destCoords}], {icon:iconB})
        .addTo(map)
        .bindPopup('<b>Arrivée :</b> ${(destination.name||'').replace(/'/g,"\\'")}')
    `)
  }

  // Ligne entre les deux points
  const polylineJs = (showRoute && originCoords && destCoords) ? `
    L.polyline([[${originCoords}],[${destCoords}]], {
      color:'#1A9E8A', weight:4, opacity:.8, dashArray:'8 6'
    }).addTo(map)

    map.fitBounds([[${originCoords}],[${destCoords}]], {padding:[40,40]})
  ` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;font-family:-apple-system,sans-serif}
  .leaflet-control-attribution{font-size:9px!important}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map',{
    center:[${centerLat},${centerLon}],
    zoom:${zoom},
    zoomControl:true,
    attributionControl:true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap',
    maxZoom:18
  }).addTo(map)

  ${markersJs.join('\n')}
  ${polylineJs}
</script>
</body>
</html>`
}
