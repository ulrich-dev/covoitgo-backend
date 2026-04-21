import { useState, useRef, useEffect } from 'react'
import { searchCities, MAJOR_CITIES, CAMEROON_REGIONS, ALL_CITIES } from '../data/cameroun'

// ════════════════════════════════════════════════════════════
//  CityPicker — Sélecteur de ville avec recherche
//
//  Props:
//    value       — ville sélectionnée
//    onChange    — callback(ville)
//    placeholder — texte placeholder
//    exclude     — ville à exclure (ex: ville de départ)
// ════════════════════════════════════════════════════════════
export default function CityPicker({ value, onChange, placeholder = 'Ville', exclude = '', style = {} }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const inputRef = useRef(null)

  const results = query.length >= 1
    ? searchCities(query).filter(c => c !== exclude)
    : MAJOR_CITIES.filter(c => c !== exclude).slice(0, 8)

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const select = (city) => {
    onChange(city)
    setQuery('')
    setOpen(false)
  }

  return (
    <>
      {/* Déclencheur */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        8,
          width:      '100%',
          background: 'none',
          border:     'none',
          padding:    0,
          cursor:     'pointer',
          fontFamily: 'inherit',
          textAlign:  'left',
          ...style,
        }}>
        <span style={{
          fontSize:   value ? 16 : 15,
          fontWeight: value ? 700 : 400,
          color:      value ? '#111827' : '#9CA3AF',
          flex:       1,
        }}>
          {value || placeholder}
        </span>
        {value && (
          <span
            onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ fontSize:16, color:'#D1D5DB', cursor:'pointer', padding:'0 2px' }}>
            ✕
          </span>
        )}
      </button>

      {/* Bottom Sheet de sélection */}
      {open && (
        <>
          {/* Overlay */}
          <div
            onClick={() => { setOpen(false); setQuery('') }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9000 }}
          />

          {/* Panel */}
          <div style={{
            position:     'fixed',
            bottom:       0,
            left:         0,
            right:        0,
            zIndex:       9001,
            background:   '#fff',
            borderRadius: '24px 24px 0 0',
            maxHeight:    '92vh',
            display:      'flex',
            flexDirection:'column',
            boxShadow:    '0 -8px 40px rgba(0,0,0,.15)',
          }}>

            {/* Handle */}
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#E5E7EB' }}/>
            </div>

            {/* Header + barre de recherche */}
            <div style={{ padding:'12px 16px 0' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h3 style={{ fontSize:18, fontWeight:900, margin:0, color:'#111827' }}>
                  {placeholder}
                </h3>
                <button onClick={() => { setOpen(false); setQuery('') }}
                  style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF', padding:0 }}>
                  ✕
                </button>
              </div>

              {/* Barre de recherche */}
              <div style={{
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                background:   '#F2F3F7',
                borderRadius: 14,
                padding:      '10px 14px',
                marginBottom: 4,
              }}>
                <span style={{ fontSize:16, color:'#9CA3AF' }}>🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher une ville ou un village…"
                  style={{
                    flex:       1,
                    border:     'none',
                    background: 'transparent',
                    outline:    'none',
                    fontSize:   15,
                    fontFamily: 'inherit',
                    color:      '#111827',
                  }}
                />
                {query && (
                  <button onClick={() => setQuery('')}
                    style={{ background:'none', border:'none', fontSize:16, color:'#9CA3AF', cursor:'pointer', padding:0 }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Compteur résultats */}
              {query.length >= 1 && (
                <p style={{ fontSize:12, color:'#9CA3AF', margin:'6px 0 0', fontWeight:500 }}>
                  {results.length} ville{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Liste */}
            <div style={{ overflowY:'auto', flex:1, padding:'8px 0 24px' }}>

              {/* Villes populaires si pas de recherche */}
              {query.length === 0 && (
                <p style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', padding:'8px 16px 4px', textTransform:'uppercase', letterSpacing:'.08em' }}>
                  Villes populaires
                </p>
              )}

              {results.map(city => (
                <button
                  key={city}
                  onClick={() => select(city)}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            12,
                    width:          '100%',
                    padding:        '13px 16px',
                    border:         'none',
                    background:     value === city ? '#E8F7F4' : 'transparent',
                    cursor:         'pointer',
                    fontFamily:     'inherit',
                    textAlign:      'left',
                    borderBottom:   '1px solid #F3F4F6',
                  }}>
                  <span style={{ fontSize:18 }}>📍</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight: value === city ? 800 : 600, color:'#111827' }}>
                      {city}
                    </div>
                    <div style={{ fontSize:12, color:'#9CA3AF', marginTop:1 }}>
                      {getRegion(city)}
                    </div>
                  </div>
                  {value === city && <span style={{ color:'#1A9E8A', fontSize:18 }}>✓</span>}
                </button>
              ))}

              {/* Aucun résultat */}
              {query.length >= 2 && results.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 20px' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🗺️</div>
                  <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>
                    Ville introuvable
                  </p>
                  <p style={{ fontSize:13, color:'#9CA3AF' }}>
                    Vérifiez l'orthographe ou essayez une ville voisine
                  </p>
                </div>
              )}

              {/* Par région si pas de recherche */}
              {query.length === 0 && (
                <>
                  <div style={{ height:1, background:'#F3F4F6', margin:'8px 16px' }}/>
                  {Object.entries(CAMEROON_REGIONS).map(([region, data]) => (
                    <div key={region}>
                      <p style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', padding:'12px 16px 4px', textTransform:'uppercase', letterSpacing:'.08em' }}>
                        <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:data.color, marginRight:6 }}/>
                        {region}
                      </p>
                      {data.cities.filter(c => c !== exclude).map(city => (
                        <button
                          key={city}
                          onClick={() => select(city)}
                          style={{
                            display:     'flex',
                            alignItems:  'center',
                            gap:         12,
                            width:       '100%',
                            padding:     '11px 16px',
                            border:      'none',
                            background:  value === city ? '#E8F7F4' : 'transparent',
                            cursor:      'pointer',
                            fontFamily:  'inherit',
                            textAlign:   'left',
                            borderBottom:'1px solid #F9FAFB',
                          }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:data.color, flexShrink:0 }}/>
                          <span style={{ fontSize:14, fontWeight: value === city ? 700 : 500, color:'#374151', flex:1 }}>
                            {city}
                          </span>
                          {value === city && <span style={{ color:'#1A9E8A', fontSize:16 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Trouver la région d'une ville
function getRegion(city) {
  for (const [region, data] of Object.entries(CAMEROON_REGIONS)) {
    if (data.cities.includes(city)) return region
  }
  return 'Cameroun'
}
