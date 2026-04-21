import { useEffect, useRef } from 'react'

// ══════════════════════════════════════════════════════════════
//  TripMap — Carte interactive MapLibre + OpenStreetMap
//  Affiche origine, destination, position temps réel
// ══════════════════════════════════════════════════════════════

export default function TripMap({
  origin,          // { lat, lon, name }
  destination,     // { lat, lon, name }
  myPosition,      // { latitude, longitude, heading }
  otherPosition,   // { latitude, longitude }
  routeGeoJSON,    // optional GeoJSON de la route
  progress = 0,    // 0-100
  height = '100%',
}) {
  const mapRef      = useRef(null)
  const containerRef = useRef(null)
  const markersRef  = useRef({})

  // Initialisation carte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Charger MapLibre dynamiquement
    (async () => {
      const maplibre = await import('maplibre-gl')
      await import('maplibre-gl/dist/maplibre-gl.css')

      const center = origin ? [origin.lon, origin.lat] : [11.5021, 3.848]

      mapRef.current = new maplibre.Map({
        container: containerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center,
        zoom: 10,
        attributionControl: false,
      })

      mapRef.current.addControl(new maplibre.NavigationControl(), 'top-right')

      mapRef.current.on('load', () => {
        // Ajouter la route si fournie
        if (routeGeoJSON) {
          mapRef.current.addSource('route', { type:'geojson', data:routeGeoJSON })
          mapRef.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': '#1A9E8A',
              'line-width': 5,
              'line-opacity': 0.8,
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          })
        }

        // Marqueurs origine / destination
        if (origin) {
          const el = createPinElement('#1A9E8A', '🅰')
          markersRef.current.origin = new maplibre.Marker({ element: el })
            .setLngLat([origin.lon, origin.lat])
            .setPopup(new maplibre.Popup().setText(`Départ: ${origin.name || ''}`))
            .addTo(mapRef.current)
        }
        if (destination) {
          const el = createPinElement('#EF4444', '🅱')
          markersRef.current.dest = new maplibre.Marker({ element: el })
            .setLngLat([destination.lon, destination.lat])
            .setPopup(new maplibre.Popup().setText(`Arrivée: ${destination.name || ''}`))
            .addTo(mapRef.current)
        }

        // Fit bounds si les deux points sont là
        if (origin && destination) {
          const bounds = new maplibre.LngLatBounds([origin.lon, origin.lat], [destination.lon, destination.lat])
          mapRef.current.fitBounds(bounds, { padding: 60, duration: 800 })
        }
      })
    })()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [origin?.lat, destination?.lat])

  // Mise à jour position utilisateur
  useEffect(() => {
    if (!mapRef.current || !myPosition) return
    const maplibre = window.maplibregl || require('maplibre-gl')

    if (!markersRef.current.me) {
      const el = createCarElement('#1A9E8A')
      markersRef.current.me = new maplibre.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat([myPosition.longitude, myPosition.latitude])
        .addTo(mapRef.current)
    } else {
      markersRef.current.me.setLngLat([myPosition.longitude, myPosition.latitude])
    }

    if (myPosition.heading !== null && myPosition.heading !== undefined) {
      markersRef.current.me.setRotation(myPosition.heading)
    }
  }, [myPosition?.latitude, myPosition?.longitude, myPosition?.heading])

  // Mise à jour position de l'autre
  useEffect(() => {
    if (!mapRef.current || !otherPosition) return
    const maplibre = window.maplibregl || require('maplibre-gl')

    if (!markersRef.current.other) {
      const el = createCarElement('#F59E0B')
      markersRef.current.other = new maplibre.Marker({ element: el })
        .setLngLat([otherPosition.longitude, otherPosition.latitude])
        .addTo(mapRef.current)
    } else {
      markersRef.current.other.setLngLat([otherPosition.longitude, otherPosition.latitude])
    }
  }, [otherPosition?.latitude, otherPosition?.longitude])

  return (
    <div style={{ position:'relative', width:'100%', height, minHeight:200 }}>
      <div ref={containerRef} style={{ width:'100%', height:'100%' }}/>

      {/* Barre de progression en overlay */}
      {progress > 0 && (
        <div style={{
          position:'absolute', top:12, left:12, right:12, zIndex:5,
          background:'rgba(255,255,255,.95)', borderRadius:14,
          padding:'10px 14px', boxShadow:'0 2px 12px rgba(0,0,0,.15)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Progression du trajet</span>
            <span style={{ fontSize:12, fontWeight:800, color:'#1A9E8A' }}>{progress}%</span>
          </div>
          <div style={{ height:6, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:`${progress}%`, height:'100%', background:'linear-gradient(90deg,#1A9E8A,#22C6AD)', transition:'width .5s' }}/>
          </div>
        </div>
      )}
    </div>
  )
}

function createPinElement(color, text) {
  const el = document.createElement('div')
  el.style.cssText = `width:36px;height:36px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)`
  el.innerHTML = `<span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:14px">${text}</span>`
  return el
}

function createCarElement(color) {
  const el = document.createElement('div')
  el.style.cssText = `width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:${color};border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px`
  el.textContent = '🚗'
  return el
}
